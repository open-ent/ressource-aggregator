package fr.openent.mediacentre.source;

import fr.openent.mediacentre.core.constants.Field;
import fr.openent.mediacentre.helper.FutureHelper;
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
     * Get GAR resources from mock file
     */
    private void getResources(UserInfos user, String structureId, Handler<Either<String, JsonArray>> handler) {
        try {
            InputStream is = getClass().getClassLoader().getResourceAsStream("gar-ressources.json");
            if (is == null) {
                is = Thread.currentThread().getContextClassLoader().getResourceAsStream("gar-ressources.json");
            }

            if (is != null) {
                java.util.Scanner s = new java.util.Scanner(is, "UTF-8").useDelimiter("\\A");
                String result = s.hasNext() ? s.next() : "";
                is.close();

                JsonArray allResources = new JsonArray(result);
                handler.handle(new Either.Right<>(allResources));
            } else {
                handler.handle(new Either.Left<>("gar.mock.file.not.found"));
            }
        } catch (Exception e) {
            handler.handle(new Either.Left<>("gar.mock.read.error"));
        }
    }

    public Future<JsonArray> getAllUserResources(UserInfos user) {
        Promise<JsonArray> promise = Promise.promise();
        List<Future<JsonArray>> futures = new ArrayList<>();
        List<String> structures = user.getStructures();

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
        getAllUserResources(user).onComplete(event -> {
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