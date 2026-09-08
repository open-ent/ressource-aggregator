package fr.openent.mediacentre.source;

import fr.openent.mediacentre.core.constants.Field;
import fr.openent.mediacentre.helper.FutureHelper;
import fr.openent.mediacentre.security.WorkflowActionUtils;
import fr.openent.mediacentre.security.WorkflowActions;
import fr.openent.mediacentre.service.FavoriteService;
import fr.openent.mediacentre.service.impl.DefaultFavoriteService;
import fr.wseduc.webutils.Either;
import io.vertx.core.*;
import io.vertx.core.eventbus.EventBus;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;
import org.entcore.common.user.UserInfos;

import java.io.InputStream;
import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import static fr.wseduc.webutils.Utils.handlerToAsyncHandler;
import static fr.wseduc.webutils.Utils.isEmpty;

public class GAR implements Source {
    private final FavoriteService favoriteService = new DefaultFavoriteService();

    private final Logger log = LoggerFactory.getLogger(GAR.class);
    private EventBus eb;
    private JsonObject config;

    // L'image par défaut utilise déjà le préfixe fonctionnel
    private static final String DEFAULT_THUMBNAIL = "/mediacentre/public/img/default-resource.png";
    // Le préfixe de contexte
    private static final String CONTEXT_PREFIX = "/mediacentre/public/";

    /**
     * Retrieve and format user GAR resources
     */
    private void getData(UserInfos user, String structureId, Handler<Either<String, JsonArray>> handler) {
        Promise<JsonArray> getRessourcesPromise = Promise.promise();
        Promise<JsonArray> getFavoritesResourcesPromise = Promise.promise();

        Future.all(getRessourcesPromise.future(), getFavoritesResourcesPromise.future()).onComplete(event -> {
            if (event.failed()) {
                handler.handle(new Either.Left<>(event.cause().getMessage()));
            } else {
                final String domain = (String) user.getOtherProperties().get("domain");
                JsonArray formattedResources = getRessourcesPromise.future().result().stream()
                        .filter(JsonObject.class::isInstance)
                        .map(JsonObject.class::cast)
                        .map(resource -> format(domain, resource))
                        .collect(JsonArray::new, JsonArray::add, JsonArray::addAll);

                handler.handle(new Either.Right<>(formattedResources));
            }
        });

        getResources(user, structureId, FutureHelper.handlerJsonArray(getRessourcesPromise));
        favoriteService.get(GAR.class.getName(), user.getUserId(), FutureHelper.handlerJsonArray(getFavoritesResourcesPromise));
    }

    /**
     * Get GAR resources : bouchon local (config "gar-mock": true, ex. environnement sans
     * gar-connector déployé) ou vrai flux via le bus d'événements vers gar-connector
     * ("gar-mock": false ou absent — comportement historique restauré, cf. commit 7fefa6a
     * "fix: mock ressources GAR" qui l'avait temporairement remplacé).
     */
    private void getResources(UserInfos user, String structureId, Handler<Either<String, JsonArray>> handler) {
        if (config != null && config.getBoolean("gar-mock", false)) {
            getMockResources(structureId, handler);
        } else {
            getRealResources(user, structureId, handler);
        }
    }

    /**
     * Vrai flux GAR : délègue à gar-connector via le bus d'événements (adresse historique
     * "openent.mediacentre", cf. fr.openent.gar.Gar.GAR_ADDRESS et
     * GarController#case "getResources" côté connecteur). Nécessite gar-connector déployé et
     * le droit WorkflowActions.GAR_RIGHT sur l'utilisateur — sinon liste vide (comportement
     * d'origine, pas une erreur).
     */
    private void getRealResources(UserInfos user, String structureId, Handler<Either<String, JsonArray>> handler) {
        if (WorkflowActionUtils.hasRight(user, WorkflowActions.GAR_RIGHT.toString())) {
            JsonObject action = new JsonObject()
                    .put("action", "getResources")
                    .put("structure", structureId)
                    .put("user", user.getUserId())
                    .put("hostname", config.getString("host").split("//")[1]);

            String GAR_ADDRESS = "openent.mediacentre";
            eb.request(GAR_ADDRESS, action, handlerToAsyncHandler(event -> {
                if (!"ok".equals(event.body().getString("status"))) {
                    log.error("[Gar@search] Failed to retrieve gar resources", event.body().getString("message"));
                    handler.handle(new Either.Left<>(event.body().getString("message")));
                    return;
                }
                handler.handle(new Either.Right<>(event.body().getJsonArray("message")));
            }));
        } else {
            handler.handle(new Either.Right<>(new JsonArray()));
        }
    }

    /**
     * Bouchon GAR : pas de vrai flux par UAI (la vraie différenciation par établissement ne
     * sera testable qu'en prod contre le GAR réel). Pour rendre le sélecteur multi-établissement
     * démontrable en local sans gar-connector, on sert un second catalogue, plus restreint, en
     * alternance par structureId (hash pair/impair) : PUREMENT illustratif pour la démo, ne
     * reflète aucune vraie différence de catalogue GAR par établissement.
     */
    private void getMockResources(String structureId, Handler<Either<String, JsonArray>> handler) {
        String fileName = (structureId != null && (structureId.hashCode() & 1) != 0)
                ? "gar-ressources-structure2.json"
                : "gar-ressources.json";
        try {
            InputStream is = getClass().getClassLoader().getResourceAsStream(fileName);
            if (is == null) {
                is = Thread.currentThread().getContextClassLoader().getResourceAsStream(fileName);
            }

            if (is != null) {
                java.util.Scanner s = new java.util.Scanner(is, "UTF-8").useDelimiter("\\A");
                String result = s.hasNext() ? s.next() : "";
                is.close();

                handler.handle(new Either.Right<>(new JsonArray(result)));
            } else {
                handler.handle(new Either.Left<>("gar.mock.file.not.found"));
            }
        } catch (Exception e) {
            handler.handle(new Either.Left<>("gar.mock.read.error"));
        }
    }

    public Future<JsonArray> getAllUserResources(UserInfos user) {
        return getAllUserResources(user, null);
    }

    /**
     * Comme getAllUserResources(user), mais restreint aux établissements de idStructures quand
     * cette liste est fournie et non vide (sinon replie sur tous les établissements de l'utilisateur).
     * Ajouté pour que le sélecteur d'établissement du frontend (multi-établissements) filtre
     * réellement les ressources — initTextBooks() acceptait déjà idStructures en paramètre mais
     * ne l'utilisait jamais, fusionnant systématiquement tous les établissements.
     */
    public Future<JsonArray> getAllUserResources(UserInfos user, List<String> idStructures) {
        Promise<JsonArray> promise = Promise.promise();
        List<Future<JsonArray>> futures = new ArrayList<>();
        List<String> structures = (idStructures == null || idStructures.isEmpty())
                ? user.getStructures() : idStructures;

        for (String structure : structures) {
            Promise<JsonArray> resourcesPromise = Promise.promise();
            futures.add(resourcesPromise.future());
            getResources(user, structure, FutureHelper.handlerJsonArray(resourcesPromise));
        }

        Future.join(futures).onComplete(event -> {
            JsonArray resources = new JsonArray();
            for (Future<JsonArray> future : futures) {
                if (future.succeeded()) {
                    resources.addAll(future.result());
                }
            }
            promise.complete(resources);
        });

        return promise.future();
    }

    private void getStructuresData(UserInfos user, List<String> idStructures, List<Future<JsonArray>> futures, Handler<AsyncResult<CompositeFuture>> handler) {
        List<String> structures = idStructures == null || idStructures.isEmpty() ? user.getStructures() : idStructures;
        for (String structure : structures) {
            Promise<JsonArray> promise = Promise.promise();
            futures.add(promise.future());
            getData(user, structure, FutureHelper.handlerJsonArray(promise));
        }
        Future.join(futures).onComplete(handler);
    }

    @Override
    public void plainTextSearch(String query, UserInfos user, Handler<Either<JsonObject, JsonObject>> handler) {
        plainTextSearch(query, user, null, handler);
    }

    @Override
    public void plainTextSearch(String query, UserInfos user, List<String> idStructures, Handler<Either<JsonObject, JsonObject>> handler) {
        // GAR n'expose que des manuels numériques (onglet Manuels, cf. initTextBooks) : il ne doit
        // jamais apparaître dans la recherche générale "Ressources" (avant le bouchon JSON, l'appel
        // réel à l'API GAR n'était d'ailleurs jamais invoqué depuis ce chemin de recherche générale).
        handler.handle(new Either.Left<>(new JsonObject().put("source", GAR.class.getName()).put("message", "[GAR] not a resources search source")));
    }

    @Override
    public void advancedSearch(JsonObject query, UserInfos user, Handler<Either<JsonObject, JsonObject>> handler) {
        plainTextSearch("", user, handler);
    }

    private String queryPattern(JsonArray values) {
        if (values == null || values.isEmpty()) return "match-nothing-pattern-xyz";
        StringBuilder pattern = new StringBuilder();
        for (int i = 0; i < values.size(); i++) {
            pattern.append(Pattern.quote(values.getString(i))).append("|");
        }
        return pattern.substring(0, pattern.length() - 1);
    }

    @Override
    public JsonObject format(JsonObject resource) {
        return format("", resource);
    }

    @Override
    public JsonObject format(String domain, JsonObject resource) {
        String textbookPattern = queryPattern(config.getJsonArray("textbook_typology", new JsonArray()));
        Pattern regexp = Pattern.compile(textbookPattern, Pattern.CASE_INSENSITIVE);

        // RÉCUPÉRATION DE LA VIGNETTE
        String thumbnail = resource.getString("urlVignette");

        // SI VIDE -> IMAGE PAR DÉFAUT
        if (isEmpty(thumbnail)) {
            thumbnail = DEFAULT_THUMBNAIL;
        } else if (!thumbnail.startsWith("http")) {
            // SI RELATIF -> ON AJOUTE LE PRÉFIXE DE CONTEXTE /mediacentre/public/
            // On enlève le slash de début s'il existe pour éviter les doubles slashes //
            String cleanPath = thumbnail.startsWith("/") ? thumbnail.substring(1) : thumbnail;
            thumbnail = CONTEXT_PREFIX + cleanPath;
        }

        JsonObject formattedResource = new JsonObject()
                .put("title", resource.getString("nomRessource"))
                .put("editors", new JsonArray().add(resource.getString("nomEditeur")))
                .put("authors", new JsonArray())
                .put("image", thumbnail)
                .put("disciplines", getNames("domaineEnseignement", resource))
                .put("levels", getNames("niveauEducatif", resource))
                .put("document_types", getNames("typologieDocument", resource))
                .put("link", proxifyLink(domain, resource.getString("urlAccesRessource"), resource.getJsonObject("typePresentation")))
                .put("source", GAR.class.getName())
                .put("plain_text", createPlainText(resource))
                .put("id", resource.getString("idRessource"))
                .put("favorite", false)
                .put("date", System.currentTimeMillis())
                .put("structure_name", resource.getString("structure_name"))
                .put("structure_uai", resource.getString("structure_uai"));

        // GESTION IS_TEXTBOOK
        JsonObject type = resource.getJsonObject("typePresentation", new JsonObject());
        if (type.containsKey("code") && regexp.matcher(type.getString("code")).find()) {
            formattedResource.put("is_textbook", true);
        }

        return formattedResource;
    }

    private String proxifyLink(String domain, String link, JsonObject typePresentation) {
        if (typePresentation == null || isEmpty(typePresentation.getString("code"))) return link;
        try {
            return (domain != null ? domain : "") + Field.RESOURCE_PROXY_PREFIX +
                    URLEncoder.encode(link, StandardCharsets.UTF_8.name()) +
                    Field.RESOURCE_PROXY_SERVICE + typePresentation.getString("code");
        } catch (UnsupportedEncodingException e) {
            return link;
        }
    }

    private String createPlainText(JsonObject resource) {
        StringBuilder plain = new StringBuilder();
        JsonArray domaines = resource.getJsonArray("domaineEnseignement", new JsonArray());
        for (int i = 0; i < domaines.size(); i++) {
            plain.append(domaines.getJsonObject(i).getString("nom")).append(" ");
        }
        return plain.toString();
    }

    private JsonArray getNames(String key, JsonObject resource) {
        JsonArray names = new JsonArray();
        JsonArray values = resource.getJsonArray(key, new JsonArray());
        for (int i = 0; i < values.size(); i++) {
            names.add(values.getJsonObject(i).getString("nom"));
        }
        return names;
    }

    @Override
    public void amass() { }

    @Override
    public void setEventBus(EventBus eb) { this.eb = eb; }

    @Override
    public void setConfig(JsonObject config) { this.config = config; }

    public void initTextBooks(UserInfos user, List<String> idStructures, Handler<Either<String, JsonObject>> handler) {
        getAllUserResources(user, idStructures).onComplete(event -> {
            if (event.failed()) {
                handler.handle(new Either.Left<>(event.cause().getMessage()));
                return;
            }
            String textbookPattern = queryPattern(config.getJsonArray("textbook_typology", new JsonArray()));
            Pattern regexp = Pattern.compile(textbookPattern, Pattern.CASE_INSENSITIVE);

            JsonArray textBooks = new JsonArray();
            Set<String> addedIds = new HashSet<>();
            String domain = (String) user.getOtherProperties().get("domain");

            for (Object obj : event.result()) {
                JsonObject res = (JsonObject) obj;
                JsonObject type = res.getJsonObject("typePresentation", new JsonObject());
                String id = res.getString("idRessource");
                if (type.containsKey("code") && regexp.matcher(type.getString("code")).find() && !addedIds.contains(id)) {
                    addedIds.add(id);
                    textBooks.add(format(domain, res));
                }
            }
            handler.handle(new Either.Right<>(new JsonObject().put(Field.TEXTBOOKS, textBooks)));
        });
    }

    /*
    // Exemple de méthode commentée préservée
    private void obsoleteMethodExample() {
        // Logique métier obsolète
    }
    */
}