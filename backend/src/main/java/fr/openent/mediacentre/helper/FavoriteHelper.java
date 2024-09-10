package fr.openent.mediacentre.helper;

import fr.openent.mediacentre.core.constants.Field;
import fr.openent.mediacentre.core.constants.SourceConstant;
import fr.openent.mediacentre.enums.Profile;
import fr.openent.mediacentre.model.IModel;
import fr.openent.mediacentre.model.PinResource;
import fr.openent.mediacentre.service.FavoriteService;
import fr.openent.mediacentre.service.GlobalResourceService;
import fr.openent.mediacentre.service.SignetService;
import fr.openent.mediacentre.service.TextBookService;
import fr.openent.mediacentre.service.impl.DefaultGlobalResourceService;
import fr.openent.mediacentre.service.impl.DefaultSignetService;
import fr.openent.mediacentre.service.impl.DefaultTextBookService;
import fr.openent.mediacentre.source.Source;
import fr.wseduc.webutils.security.SecuredAction;
import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;
import org.entcore.common.user.UserInfos;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import static fr.openent.mediacentre.helper.HelperUtils.frameLoad;

public class FavoriteHelper {

    private final Logger log = LoggerFactory.getLogger(FavoriteHelper.class);
    private final TextBookService textbookService = new DefaultTextBookService();
    private final GlobalResourceService globalResourceService;


    private final SearchHelper searchHelper = new SearchHelper();
    private final SignetHelper signetHelper = new SignetHelper();

    private final SignetService signetService;

    public FavoriteHelper(Map<String, SecuredAction> securedActions) {
        this.signetService = new DefaultSignetService(securedActions);
        this.globalResourceService = new DefaultGlobalResourceService(Field.GLOBAL_COLLECTION);
    }

    public FavoriteHelper() {
        this.signetService = new DefaultSignetService();
        this.globalResourceService = new DefaultGlobalResourceService(Field.GLOBAL_COLLECTION);
    }


    /* Assign favorite to true if resources match with mongoDb's resources
     * @param favoritesResourcesFuture  favorite's resource fetched from mongoDb
     * @param resourcesArray            resource requested to assign favorite
     */
    public void matchFavorite(Future<JsonArray> favoritesResourcesFuture, JsonArray resourcesArray) {
        for (int i = 0; i < resourcesArray.size(); i++) {
            for (int j = 0; j < favoritesResourcesFuture.result().size(); j++) {
                if (resourcesArray.getJsonObject(i).getString("id")
                        .equals(favoritesResourcesFuture.result().getJsonObject(j).getString("id"))) {
                    resourcesArray.getJsonObject(i).put("favorite", true);
                }
            }
        }
    }

    public void favoritesRetrieve(              UserInfos user,
                                                FavoriteService favoriteService,
                                                List<Source> sources,
                                                ResponseHandlerHelper answer) {
        favoriteService.get(null, user.getUserId(), event -> {
            if (event.isLeft()) {
                log.error("[Mediacentre@FavoriteHelper:favoritesRetrieve] Failed to retrieve favorite" + event.left());
                answer.answerFailure(new JsonObject()
                        .put("error", event.left().getValue())
                        .put("status", "ko")
                        .encode());
                return;
            }
            JsonArray favorites = event.right().getValue();
            if (favorites.isEmpty()) {
                answer.answerSuccess(
                        frameLoad(
                                "favorites_Result",
                                "initialization",
                                "ok",
                                new JsonObject()).encode()
                );
            } else {
                favoritesExists(favorites, user, sources)
                    .onSuccess(resources -> answer.answerSuccess(
                            frameLoad(
                                "favorites_Result",
                                "get",
                                "ok",
                                resources).encode())
                    )
                    .onFailure(error -> {
                        log.error("[Mediacentre@FavoriteHelper:favoritesRetrieve] Failed to retrieve favorite" + error);
                        answer.answerFailure(new JsonObject()
                            .put("error", error.getMessage())
                            .put("status", "ko")
                            .encode());
                    });
            }
        });
    }

    public Future<JsonArray> favoritesExists(JsonArray favorites, UserInfos user, List<Source> sources) {
        Promise<JsonArray> promise = Promise.promise();
        JsonArray data = new JsonArray();
        JsonArray searchSources = new JsonArray().add(SourceConstant.MOODLE).add(SourceConstant.GAR);
        JsonObject searchQuery = new JsonObject().put(Field.QUERY, ".*");
        textbookService.get(user.getUserId())
                .recover(error -> {
                    log.error("[Mediacentre@FavoriteHelper:favoritesExists] Error while retrieving GAR resources: " + error.getMessage());
                    return Future.succeededFuture(new JsonArray());
                })
                .compose(resourcesGar -> {
                    if (resourcesGar != null && !resourcesGar.isEmpty()) {
                        data.addAll(resourcesGar);  // get GAR
                    }
                    return searchHelper.search("PLAIN_TEXT", sources, searchSources, searchQuery, user, new ArrayList<>());
                })
                .recover(error -> {
                    log.error("[Mediacentre@FavoriteHelper:favoritesExists] Error while retrieving search resources: " + error.getMessage());
                    return Future.succeededFuture(new JsonArray());
                })
                .compose(resourcesSearch -> {
                    if (resourcesSearch != null && !resourcesSearch.isEmpty()) {
                        data.addAll(resourcesSearch); // get Moodle
                    }
                    return signetHelper.signetRetrieve(user);
                })
                .recover(error -> {
                    log.error("[Mediacentre@FavoriteHelper:favoritesExists] Error while retrieving public signet resources: " + error.getMessage());
                    return Future.succeededFuture(new JsonArray());
                })
                .compose(resourcesSignet -> {
                    if (resourcesSignet != null && !resourcesSignet.isEmpty()) {
                        data.addAll(resourcesSignet); // get Public signet
                    }
                    return retrieveMySignets(user);
                })
                .recover(error -> {
                    log.error("[Mediacentre@FavoriteHelper:favoritesExists] Error while retrieving my signets resources: " + error.getMessage());
                    return Future.succeededFuture(new JsonArray());
                })
                .compose(resourcesMySignets -> {
                    if (resourcesMySignets != null && !resourcesMySignets.isEmpty()) {
                        data.addAll(resourcesMySignets); // get my signet
                    }
                    return globalResourceService.list(Profile.RELATIVE);
                })
                .recover(error -> {
                    log.error("[Mediacentre@FavoriteHelper:favoritesExists] Error while retrieving global resources: " + error.getMessage());
                    return Future.succeededFuture(new ArrayList<>());
                })
                .compose(resourcesGlobal -> {
                    if (resourcesGlobal != null && !resourcesGlobal.isEmpty()) {
                        data.addAll(IModelHelper.toJsonArray(resourcesGlobal)); // get global resources
                    }
                    return filterResources(favorites, data);
                })
                .onSuccess(promise::complete)
                .onFailure(error -> promise.fail(error.getMessage()));
        return promise.future();
    }

    private Future<JsonArray> retrieveMySignets(UserInfos user) {
        Promise<JsonArray> promiseResponse = Promise.promise();
        final List<String> groupsAndUserIds = new ArrayList<>();
        groupsAndUserIds.add(user.getUserId());
        if (user.getGroupsIds() != null) {
            groupsAndUserIds.addAll(user.getGroupsIds());
        }
        signetService.list(groupsAndUserIds, user)
                .onSuccess(promiseResponse::complete)
                .onFailure(error -> promiseResponse.fail(error.getMessage()));
        return promiseResponse.future();
    }

    private Future<JsonArray> filterResources(JsonArray favorites, JsonArray resources) {
        Promise<JsonArray> promise = Promise.promise();
        List<JsonObject> filteredResources = favorites.stream()
            .map(JsonObject.class::cast)
            .filter(favorite -> resources.stream()
                .map(JsonObject.class::cast)
                .anyMatch(resource ->
                    Objects.equals(String.valueOf(resource.getValue(Field.ID)), String.valueOf(favorite.getValue(Field.ID))) &&
                    // compare only if source is not null
                    (resource.getValue(Field.SOURCE) == null ||
                    Objects.equals(resource.getValue(Field.SOURCE), favorite.getValue(Field.SOURCE)))
                )
            )
            .collect(Collectors.toList());

        promise.complete(new JsonArray(filteredResources));
        return promise.future();
    }
}
