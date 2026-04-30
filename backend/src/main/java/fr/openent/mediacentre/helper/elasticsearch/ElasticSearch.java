package fr.openent.mediacentre.helper.elasticsearch;

import fr.wseduc.webutils.DefaultAsyncResult;
import io.vertx.core.AsyncResult;
import io.vertx.core.Future;
import io.vertx.core.Handler;
import io.vertx.core.Vertx;
import io.vertx.core.http.HttpClient;
import io.vertx.core.http.HttpClientOptions;
import io.vertx.core.http.HttpClientRequest;
import io.vertx.core.http.HttpMethod;
import io.vertx.core.http.RequestOptions;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;
import io.vertx.core.net.ProxyOptions;

import java.net.URI;
import java.util.Base64;
import java.util.Random;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Composant de gestion des interactions avec un cluster ElasticSearch.
 * Gère le pool de clients, l'équilibrage de charge entre les nœuds et la compatibilité des versions.
 */
public class ElasticSearch {

	private static final Logger log = LoggerFactory.getLogger(ElasticSearch.class);
	private ElasticSearchClient[] clients;
	private final CopyOnWriteArrayList<Integer> availableNodes = new CopyOnWriteArrayList<>();
	private final Random rnd = new Random();
	private String defaultIndex;
	private String username = null;
	private String password = null;
	private int esMajorVersion = 6;
	private Vertx vertx;

	private ElasticSearch() {}

	private static class ElasticSearchHolder {
		private static final ElasticSearch instance = new ElasticSearch();
	}

	/**
	 * Récupère l'instance unique (Singleton) de la classe ElasticSearch.
	 * @return L'instance d'ElasticSearch.
	 */
	public static ElasticSearch getInstance() {
		return ElasticSearchHolder.instance;
	}

	/**
	 * Client interne représentant une connexion à un nœud ElasticSearch spécifique.
	 */
	private static class ElasticSearchClient {
		private final int index;
		private final HttpClient client;
		private final AtomicInteger errorsCount = new AtomicInteger(0);

		private ElasticSearchClient(int index, HttpClient client) {
			this.index = index;
			this.client = client;
		}

		private boolean checkError() {
			return errorsCount.incrementAndGet() > 3;
		}

		private void checkSuccess() {
			if (errorsCount.get() > 0) {
				errorsCount.set(0);
			}
		}
	}

	/**
	 * Initialise le composant à partir d'un objet de configuration JSON.
	 * @param vertx L'instance Vert.x courante.
	 * @param elasticsearchConfig Configuration contenant les URIs des serveurs, l'index et la version.
	 */
	public void init(Vertx vertx, JsonObject elasticsearchConfig) {
		this.vertx = vertx;
		this.esMajorVersion = elasticsearchConfig.getInteger("version", 6);

		JsonArray serverUris = elasticsearchConfig.getJsonArray("server-uris");
		String serverUri = elasticsearchConfig.getString("server-uri");

		if (serverUris == null && serverUri != null) {
			serverUris = new fr.wseduc.webutils.collections.JsonArray().add(serverUri);
		}

		if (serverUris != null) {
			try {
				URI[] uris = new URI[serverUris.size()];
				for (int i = 0; i < serverUris.size(); i++) {
					uris[i] = new URI(serverUris.getString(i));
				}
				init(uris, vertx,
						elasticsearchConfig.getInteger("poolSize", 16),
						elasticsearchConfig.getBoolean("keepAlive", true),
						elasticsearchConfig);
			} catch (Exception e) {
				log.error(e.getMessage(), e);
			}
		} else {
			log.error("URI ElasticSearch invalide");
		}
	}

	/**
	 * Initialise les clients HTTP pour chaque nœud du cluster ElasticSearch.
	 * @param uris Liste des URIs des serveurs.
	 * @param vertx L'instance Vert.x.
	 * @param poolSize Taille maximale du pool de connexions.
	 * @param keepAlive Activation du maintien de la connexion.
	 * @param elasticsearchConfig Configuration complémentaire (index, identifiants, SSL).
	 */
	public void init(URI[] uris, Vertx vertx, int poolSize, boolean keepAlive, JsonObject elasticsearchConfig) {
		this.defaultIndex = elasticsearchConfig.getString("index");
		this.username = elasticsearchConfig.getString("username", null);
		this.password = elasticsearchConfig.getString("password", null);
		Boolean elasticSearchSSL = elasticsearchConfig.getBoolean("elasticsearch-ssl", false);

		this.clients = new ElasticSearchClient[uris.length];
		for (int i = 0; i < uris.length; i++) {
			HttpClientOptions httpClientOptions = new HttpClientOptions()
					.setKeepAlive(keepAlive)
					.setMaxPoolSize(poolSize)
					.setDefaultHost(uris[i].getHost())
					.setDefaultPort(uris[i].getPort())
					.setConnectTimeout(20000)
					.setSsl(elasticSearchSSL);

			if (System.getProperty("httpclient.proxyHost") != null) {
				ProxyOptions proxyOptions = new ProxyOptions()
						.setHost(System.getProperty("httpclient.proxyHost"))
						.setPort(Integer.parseInt(System.getProperty("httpclient.proxyPort")))
						.setUsername(System.getProperty("httpclient.proxyUsername"))
						.setPassword(System.getProperty("httpclient.proxyPassword"));
				httpClientOptions.setProxyOptions(proxyOptions);
			}

			this.clients[i] = new ElasticSearchClient(i, vertx.createHttpClient(httpClientOptions));
			this.availableNodes.addIfAbsent(i);
		}
	}

	/**
	 * Exécute une requête de recherche ElasticSearch.
	 * Adapte l'URL selon la version majeure d'ElasticSearch (gestion du type).
	 * @param type Le type de document (utilisé uniquement en version < 7).
	 * @param query L'objet JSON représentant la requête de recherche.
	 * @param handler Le gestionnaire de résultat asynchrone.
	 */
	public void search(String type, JsonObject query, Handler<AsyncResult<JsonObject>> handler) {
		String path = (this.esMajorVersion >= 7) ?
				this.defaultIndex + "/_search" :
				this.defaultIndex + "/" + type + "/_search";
		this.postInternal(path, 200, query, handler);
	}

	/**
	 * Envoie un document vers ElasticSearch via une méthode POST.
	 * @param type Le type de document.
	 * @param object Le corps du document à indexer.
	 * @param handler Le gestionnaire de résultat asynchrone.
	 */
	public void post(String type, JsonObject object, Handler<AsyncResult<JsonObject>> handler) {
		String path = (this.esMajorVersion >= 7) ?
				this.defaultIndex + "/_doc" :
				this.defaultIndex + "/" + type;
		this.postInternal(path, 201, object, handler);
	}

	/**
	 * Crée ou remplace un document avec un identifiant spécifique.
	 * @param type Le type de document.
	 * @param object Les données du document.
	 * @param id L'identifiant unique du document.
	 * @param handler Le gestionnaire de résultat asynchrone.
	 */
	public void create(String type, JsonObject object, Integer id, Handler<AsyncResult<JsonObject>> handler) {
		String path = (this.esMajorVersion >= 7) ?
				this.defaultIndex + "/_doc/" + id :
				this.defaultIndex + "/" + type + "/" + id;
		this.postInternal(path, 201, object, handler);
	}

	/**
	 * Supprime des documents basés sur une requête.
	 * @param object La requête définissant les documents à supprimer.
	 * @param handler Le gestionnaire de résultat asynchrone.
	 */
	public void delete(JsonObject object, Handler<AsyncResult<JsonObject>> handler) {
		this.postInternal(this.defaultIndex + "/_delete_by_query", 200, object, handler);
	}

	/**
	 * Met à jour un document existant.
	 * @param object Les champs à mettre à jour.
	 * @param id L'identifiant du document.
	 * @param handler Le gestionnaire de résultat asynchrone.
	 */
	public void update(JsonObject object, Integer id, Handler<AsyncResult<JsonObject>> handler) {
		this.postInternal(this.defaultIndex + "/_update/" + id, 200, object, handler);
	}

	/**
	 * Exécute une requête HTTP POST interne vers le cluster.
	 * Gère l'authentification Basic, les headers et la validation du code statut.
	 * @param path Le chemin relatif de l'API ElasticSearch.
	 * @param expectedStatus Le code HTTP attendu en cas de succès.
	 * @param payload Le corps de la requête.
	 * @param handler Le gestionnaire de résultat asynchrone.
	 */
	private void postInternal(String path, int expectedStatus, JsonObject payload, Handler<AsyncResult<JsonObject>> handler) {
		final ElasticSearchClient esc = getClient();

		RequestOptions requestOptions = new RequestOptions()
				.setURI(path)
				.putHeader("Content-Type", "application/json")
				.putHeader("Accept", "application/json; charset=UTF-8")
				.setMethod(HttpMethod.POST);

		if (this.username != null && this.password != null && !this.username.isEmpty() && !this.password.isEmpty()) {
			String credentials = this.username + ":" + this.password;
			requestOptions.putHeader("Authorization", "Basic " + Base64.getEncoder().encodeToString(credentials.getBytes()));
		}

		esc.client.request(requestOptions)
				.flatMap(httpClientRequest -> httpClientRequest.send(payload.encode()))
				.onSuccess(response -> {
					if (response.statusCode() == expectedStatus) {
						response.bodyHandler(respBody -> handler.handle(new DefaultAsyncResult<>(new JsonObject(respBody))));
					} else {
						handler.handle(new DefaultAsyncResult<>(new ElasticSearchException(response.statusMessage())));
					}
					esc.checkSuccess();
				})
				.onFailure(e -> {
					checkDisableClientAfterError(esc, e);
					handler.handle(Future.failedFuture(e));
				});
	}

	/**
	 * Initialise une requête Bulk pour des opérations groupées.
	 * @param type Le type de document.
	 * @param handler Le gestionnaire de résultat recevant la réponse du Bulk.
	 * @return Une instance de BulkRequest.
	 */
	public BulkRequest bulk(String type, Handler<AsyncResult<JsonObject>> handler) {
		final ElasticSearchClient esc = getClient();

		String url = (this.esMajorVersion >= 7) ?
				this.defaultIndex + "/_bulk" :
				this.defaultIndex + "/" + type + "/_bulk";

		RequestOptions requestOptions = new RequestOptions()
				.setURI(url)
				.putHeader("Content-Type", "application/x-ndjson")
				.putHeader("Accept", "application/json; charset=UTF-8")
				.setMethod(HttpMethod.POST);

		if (this.username != null && this.password != null) {
			String credentials = this.username + ":" + this.password;
			requestOptions.putHeader("Authorization", "Basic " + Base64.getEncoder().encodeToString(credentials.getBytes()));
		}

		final Future<HttpClientRequest> reqFuture = esc.client.request(requestOptions)
				.onSuccess(request -> request.setChunked(true).send()
						.onSuccess(event -> {
							if (event.statusCode() == 200) {
								event.bodyHandler(respBody -> handler.handle(new DefaultAsyncResult<>(new JsonObject(respBody))));
							} else {
								handler.handle(new DefaultAsyncResult<>(new ElasticSearchException(event.statusMessage())));
							}
							esc.checkSuccess();
						})
						.onFailure(e -> checkDisableClientAfterError(esc, e)))
				.onFailure(e -> checkDisableClientAfterError(esc, e));

		return new BulkRequest(reqFuture.result());
	}

	/**
	 * Désactive temporairement un nœud en cas d'erreurs répétées.
	 * @param esc Le client en erreur.
	 * @param e L'exception rencontrée.
	 */
	private void checkDisableClientAfterError(ElasticSearchClient esc, Throwable e) {
		log.error("Erreur avec le client ElasticSearch : " + esc.index, e);
		if (esc.checkError()) {
			availableNodes.remove(Integer.valueOf(esc.index));
			vertx.setTimer(60000L, h -> availableNodes.addIfAbsent(esc.index));
		}
	}

	/**
	 * Sélectionne un client disponible selon un algorithme aléatoire (équilibrage de charge).
	 * @return Un client ElasticSearch.
	 */
	private ElasticSearchClient getClient() {
		if (availableNodes.isEmpty()) {
			return clients[0];
		}
		return clients[availableNodes.get(rnd.nextInt(availableNodes.size()))];
	}
}