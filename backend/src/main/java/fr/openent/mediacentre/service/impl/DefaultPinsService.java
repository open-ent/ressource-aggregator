package fr.openent.mediacentre.service.impl;

import fr.openent.mediacentre.Mediacentre;
import fr.openent.mediacentre.core.constants.Field;
import fr.openent.mediacentre.core.constants.MongoConstant;
import fr.openent.mediacentre.core.constants.SourceConstant;
import fr.openent.mediacentre.helper.*;
import fr.openent.mediacentre.model.PinResource;
import fr.openent.mediacentre.service.NotifyService;
import fr.openent.mediacentre.service.PinsService;
import fr.openent.mediacentre.service.SignetService;
import fr.openent.mediacentre.service.TextBookService;
import fr.openent.mediacentre.source.Source;
import fr.wseduc.mongodb.MongoDb;
import fr.wseduc.webutils.security.SecuredAction;
import io.vertx.core.CompositeFuture;
import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.eventbus.EventBus;
import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;
import org.entcore.common.mongodb.MongoDbResult;
import org.entcore.common.neo4j.Neo4j;
import org.entcore.common.neo4j.Neo4jResult;
import org.entcore.common.notification.TimelineHelper;
import org.entcore.common.sql.Sql;
import org.entcore.common.sql.SqlResult;
import org.entcore.common.user.UserInfos;
import org.entcore.common.user.UserUtils;

import java.util.*;
import java.util.stream.Collectors;

public class DefaultPinsService implements PinsService {
    private final String collection;
    private final MongoDb mongo;
    private final EventBus eb;

    private static final Logger log = LoggerFactory.getLogger(DefaultPinsService.class);
    private final SignetService signetService;

    private final TextBookHelper textBookHelper = new TextBookHelper();
    private final SearchHelper searchHelper = new SearchHelper();
    private final SignetHelper signetHelper = new SignetHelper();
    private final NotifyService notifyService;

    private final TextBookService textbookService = new DefaultTextBookService();
    private final Neo4j neo = Neo4j.getInstance();


    public DefaultPinsService(String collection, Map<String, SecuredAction> securedActions, EventBus eb, TimelineHelper timelineHelper) {
        this.collection = collection;
        this.signetService = new DefaultSignetService(securedActions);
        this.notifyService = new DefaultNotifyService(timelineHelper, eb);
        this.mongo = MongoDb.getInstance();
        this.eb = eb;
    }

    public Future<JsonObject> create(JsonObject resource, String idStructure, List<String> structures) {
        Promise<JsonObject> promise = Promise.promise();
        if (!resource.containsKey(Field.ID) || !resource.containsKey(Field.SOURCE)) {
            promise.fail("Missing required fields id or source");
            return promise.future();
        }
        if (!resource.containsKey(Field.PINNED_TITLE) || !resource.containsKey(Field.PINNED_DESCRIPTION)) {
            promise.fail("Missing required fields pinned_title or pinned_description");
            return promise.future();
        }
        resource.put(Field.STRUCTURE_OWNER, idStructure);
        resource.put(Field.STRUCTURES_CHILDREN, new JsonArray(structures));
        PinResource pinned = new PinResource(resource);
        String errorMessage = "[Mediacentre@DefaultPinsService::create] Failed to create pinned resource : ";
        mongo.insert(collection, pinned.toJson(), MongoDbResult.validResultHandler(FutureHelper.handlerJsonObject(promise, errorMessage)));
        return promise.future();
    }

    public Future<List<PinResource>> list(String idStructure) {
        Promise<List<PinResource>> promise = Promise.promise();
        JsonObject query = new JsonObject()
            .put(MongoConstant.MONGO_OR, new JsonArray()
                .add(new JsonObject().put(Field.STRUCTURE_OWNER, idStructure))
                .add(new JsonObject().put(Field.STRUCTURES_CHILDREN, idStructure))
            );
        mongo.find(collection, query, MongoDbResult.validResultsHandler(result -> {
            if (result.isLeft()) {
                log.error("[Mediacentre@DefaultPinsService::list] Can't find pinned resources : ", result.left().getValue());
                promise.fail(result.left().getValue());
                return;
            }
            promise.complete(IModelHelper.toList(result.right().getValue(), PinResource.class));
        }));
        return promise.future();
    }

    public Future<JsonObject> delete(String idPin) {
        Promise<JsonObject> promise = Promise.promise();
        JsonObject query = new JsonObject().put(Field._ID, idPin);
        mongo.delete(collection, query, MongoDbResult.validResultHandler(FutureHelper.handlerJsonObject(promise)));
        return promise.future();
    }

    public Future<Optional<PinResource>> put(String idStructure, String idPin, JsonObject resource) {
        Promise<Optional<PinResource>> promise = Promise.promise();
        JsonObject query = new JsonObject().put(Field._ID, idPin);
        JsonObject resourceUpdated = new JsonObject(); // update only title and description
        if (resource.containsKey(Field.PINNED_TITLE) && !resource.getString(Field.PINNED_TITLE).isEmpty())
            resourceUpdated.put(Field.PINNED_TITLE, resource.getString(Field.PINNED_TITLE));
        if (resource.containsKey(Field.PINNED_DESCRIPTION))
            resourceUpdated.put(Field.PINNED_DESCRIPTION, resource.getString(Field.PINNED_DESCRIPTION));
        JsonObject update = new JsonObject().put(MongoConstant.MONGO_SET, resourceUpdated);
        mongo.update(collection, query, update, MongoDbResult.validResultHandler(IModelHelper.uniqueResultToIModel(promise, PinResource.class)));
        return promise.future();
    }

    public Future<Void> checkPinDontExist(JsonObject resource, String idStructure) {
        Promise<Void> promise = Promise.promise();
        JsonObject query = new JsonObject()
            .put(Field.ID, resource.getString(Field.ID))
            .put(Field.SOURCE, resource.getString(Field.SOURCE))
            .put(Field.STRUCTURE_OWNER, idStructure);
        mongo.findOne(collection, query, MongoDbResult.validResultHandler(event -> {
            if (event.isRight() && !event.right().getValue().isEmpty()) {
                promise.fail("Pinned resource already exists");
                return;
            } else if (event.isLeft()) {
                promise.fail(event.left().getValue());
                return;
            }
            promise.complete();
        }));
        return promise.future();
    }

    public Future<JsonObject> checkChildPin(List<String> structures, JsonObject resource) {
        Promise<JsonObject> promise = Promise.promise();

        JsonObject query = new JsonObject()
                .put(Field.ID, resource.getString(Field.ID))
                .put(Field.SOURCE, resource.getString(Field.SOURCE))
                .put(Field.STRUCTURE_OWNER, new JsonObject().put(MongoConstant.MONGO_IN, new JsonArray(structures)));

        mongo.delete(collection, query, MongoDbResult.validResultHandler(FutureHelper.handlerJsonObject(promise)));

        return promise.future();
    }

    public Future<Void> checkParentPin(String idStructure, JsonObject resource) {
        Promise<Void> promise = Promise.promise();
        JsonObject query = new JsonObject()
            .put(Field.ID, resource.getString(Field.ID))
            .put(Field.SOURCE, resource.getString(Field.SOURCE))
            .put(Field.STRUCTURES_CHILDREN, new JsonObject().put(MongoConstant.MONGO_IN, new JsonArray().add(idStructure)));
        mongo.findOne(collection, query, MongoDbResult.validResultHandler(event -> {
            if (event.isRight() && !event.right().getValue().isEmpty()) {
                promise.fail("Parent have already pinned this resource");
                return;
            } else if (event.isLeft()) {
                promise.fail(event.left().getValue());
                return;
            }
            promise.complete();
        }));
        return promise.future();
    }

    public Future<JsonArray> getData(List<PinResource> resources, UserInfos user, List<Source> sources) {
        Promise<JsonArray> promise = Promise.promise();
        JsonArray data = new JsonArray();
        JsonArray searchSources = new JsonArray(new JsonArray().add(SourceConstant.MOODLE).add(SourceConstant.GAR).stream()
        .map(String.class::cast)
        .filter(expectedSource -> sources.stream()
            .map(source -> source.getClass().getName())
            .collect(Collectors.toList())
            .contains(expectedSource)
        )
        .collect(Collectors.toList()));
        JsonObject searchQuery = new JsonObject().put(Field.QUERY, ".*");
        textBookHelper.getTextBooks(user.getUserId())
            .recover(error -> {
                log.error("Error while retrieving GAR resources: " + error.getMessage());
                return Future.succeededFuture(new JsonArray());
            })
            .compose(resourcesGar -> {
                if (resourcesGar != null && !resourcesGar.isEmpty()) {
                    data.addAll(resourcesGar);  // get GAR
                }
                return searchHelper.search("PLAIN_TEXT", sources, searchSources, searchQuery, user, new ArrayList<>());
            })
            .recover(error -> {
                log.error("Error while retrieving search resources: " + error.getMessage());
                return Future.succeededFuture(new JsonArray());
            })
            .compose(resourcesSearch -> {
                if (resourcesSearch != null && !resourcesSearch.isEmpty()) {
                    data.addAll(resourcesSearch); // get Moodle
                }
                return signetHelper.signetRetrieve(user);
            })
            .recover(error -> {
                log.error("Error while retrieving public signet resources: " + error.getMessage());
                return Future.succeededFuture(new JsonArray());
            })
            .compose(resourcesSignet -> {
                if (resourcesSignet != null && !resourcesSignet.isEmpty()) {
                    data.addAll(resourcesSignet); // get Public signet
                }
                return retrieveMySignets(user);
            })
            .recover(error -> {
                log.error("Error while retrieving my signets resources: " + error.getMessage());
                return Future.succeededFuture(new JsonArray());
            })
            .compose(resourcesMySignets -> {
                if (resourcesMySignets != null && !resourcesMySignets.isEmpty()) {
                    data.addAll(resourcesMySignets); // get my signet
                }
                return enrichResources(resources, data);
            })
            .onSuccess(promise::complete)
            .onFailure(error -> promise.fail(error.getMessage()));
        return promise.future();
    }

    @Override
    public Future<Void> sendNotification(HttpServerRequest request, JsonObject resource, List<String> structures, String structureId) {
        Promise<Void> promise = Promise.promise();
        structures.add(structureId);
        List<Future> futures = new ArrayList<>();
        for (String structure : structures) {
            futures.add(getAllUsersIdsInStructure(structure)); // get all users in a structures
        }
        CompositeFuture.all(futures)
            .onSuccess(composite -> {
                // get all users ids of all structures
                List<String> allUsers = composite.list().stream()
                        .flatMap(ids -> ((JsonArray) ids).stream())
                        .map(Object::toString)
                        .collect(Collectors.toList());

                UserUtils.getUserInfos(eb, request, user -> {
                    switch (resource.getString(Field.SOURCE)) {
                        case SourceConstant.MOODLE:
                            structureIsParent(structureId)
                                .onSuccess(isParent -> {
                                    notifyService.notifyNewPinnedResource(request, new JsonArray(allUsers), isParent);
                                    promise.complete();
                                })
                                .onFailure(error -> {
                                    log.error("[Mediacentre@DefaultPinsService:sendNotification] Error while checking if structure is parent: " + error.getMessage());
                                    promise.fail(error.getMessage());
                                });
                            break;
                        case SourceConstant.GAR:
                            structureIsParent(structureId)
                                .onSuccess(isParent -> {
                                    if (resource.getValue(Field.IS_TEXTBOOK) != null && resource.getBoolean(Field.IS_TEXTBOOK)) {
                                        textbookService.getUsersHaveTextbook(resource.getString(Field.ID))
                                            .onSuccess(users -> {
                                                JsonArray usersIds = users.stream()
                                                        .map(JsonObject.class::cast)
                                                        .map(json -> json.getString(Field.USER))
                                                        .filter(allUsers::contains)
                                                        .collect(JsonArray::new, JsonArray::add, JsonArray::addAll);
                                                notifyService.notifyNewPinnedResource(request, usersIds, isParent);
                                                promise.complete();
                                            })
                                            .onFailure(error -> {
                                                log.error("[Mediacentre@DefaultPinsService:sendNotification] Error while retrieving textbook: " + error.getMessage());
                                                promise.fail(error.getMessage());
                                            });
                                    } else {
                                        textbookService.getUsersHaveExternalResource(resource.getString(Field.ID))
                                            .onSuccess(users -> {
                                                JsonArray usersIds = users.stream()
                                                        .map(JsonObject.class::cast)
                                                        .map(json -> json.getString(Field.USER))
                                                        .filter(allUsers::contains)
                                                        .collect(JsonArray::new, JsonArray::add, JsonArray::addAll);
                                                notifyService.notifyNewPinnedResource(request, usersIds, isParent);
                                                promise.complete();
                                            })
                                            .onFailure(error -> {
                                                log.error("[Mediacentre@DefaultPinsService:sendNotification] Error while retrieving external resource: " + error.getMessage());
                                                promise.fail(error.getMessage());
                                            });
                                    }
                                })
                                .onFailure(error -> {
                                    log.error("[Mediacentre@DefaultPinsService:sendNotification] Error while checking if structure is parent: " + error.getMessage());
                                    promise.fail(error.getMessage());
                                });
                            break;
                        default:
                            signetHelper.signetRetrieve(user)
                                .onSuccess(signets -> {
                                    Optional<JsonObject> optionalSignet = signets.stream()
                                        .map(JsonObject.class::cast)
                                        .filter(signet -> String.valueOf(signet.getValue(Field.ID)).equals(String.valueOf(resource.getString(Field.ID))))
                                        .findFirst();

                                    if (optionalSignet.isPresent()) {
                                        structureIsParent(structureId)
                                            .onSuccess(isParent -> {
                                                notifyService.notifyNewPinnedResource(request, new JsonArray(allUsers), isParent);
                                                promise.complete();
                                            })
                                            .onFailure(error -> {
                                                log.error("[Mediacentre@DefaultPinsService:sendNotification] Error while checking if structure is parent: " + error.getMessage());
                                                promise.fail(error.getMessage());
                                            });
                                    } else {
                                        retrieveUsersHasShared(String.valueOf(resource.getValue(Field.ID)))
                                            .onSuccess(result -> structureIsParent(structureId)
                                                .onSuccess(isParent -> {
                                                    notifyService.notifyNewPinnedResource(request, result, isParent);
                                                    promise.complete();
                                                })
                                                .onFailure(error -> {
                                                    log.error("[Mediacentre@DefaultPinsService:sendNotification] Error while checking if structure is parent: " + error.getMessage());
                                                    promise.fail(error.getMessage());
                                                }))
                                            .onFailure(error -> {
                                                log.error("[Mediacentre@DefaultPinsService:sendNotification] Error while retrieving users who have shared the resource: " + error.getMessage());
                                                promise.fail(error.getMessage());
                                            });
                                    }
                                })
                                .onFailure(error -> {
                                    log.error("[Mediacentre@DefaultPinsService:sendNotification] Error while retrieving public signet resources: " + error.getMessage());
                                    promise.fail(error.getMessage());
                                });
                            break;
                    }
                });
            })
            .onFailure(error -> {
                log.error("[Mediacentre@DefaultPinsService:sendNotification] Error while retrieving users in structures: " + error.getMessage());
                promise.fail(error.getMessage());
            });
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

    private Future<JsonArray> enrichResources(List<PinResource> resources, JsonArray data) {
        Promise<JsonArray> promise = Promise.promise();
        List<JsonObject> enrichedResources = resources.stream()
                .map(resource -> {
                    JsonObject enrichedResource = IModelHelper.toJson(resource, false, true);

                    return data.stream()
                            .map(JsonObject.class::cast)
                            .filter(dataItem ->
                                Objects.equals(String.valueOf(dataItem.getValue(Field.ID)), String.valueOf(enrichedResource.getValue(Field.ID))) &&
                                (dataItem.getValue(Field.SOURCE) == null || enrichedResource.getValue(Field.SOURCE) == null ||
                                Objects.equals(dataItem.getValue(Field.SOURCE), enrichedResource.getValue(Field.SOURCE)))
                            )
                            .findFirst()
                            .map(dataItem -> {
                                dataItem.fieldNames().forEach(fieldName -> {
                                    if (!fieldName.equals(Field._ID)) {
                                        enrichedResource.put(fieldName, dataItem.getValue(fieldName));
                                    }
                                });
                                return enrichedResource;
                            })
                            .orElse(null);
                })
                .filter(Objects::nonNull) // Remove null entries
                .collect(Collectors.toList());

        promise.complete(new JsonArray(enrichedResources));
        return promise.future();
    }

    // Get all structures that are not parents
    // and add the label "is_parent" to the resources whose structure owner has no parent
    @Override
    public Future<JsonArray> getStructureIsParent(JsonArray resources, UserInfos userInfos) {
        Promise<JsonArray> promise = Promise.promise();

        String query =
                "MATCH (s:Structure) " +
                "OPTIONAL MATCH (s)-[r:HAS_ATTACHMENT]->(ps:Structure) " +
                "WITH s, ps " +
                "WHERE ps IS NULL " +
                "RETURN s.id as idStructure, s.name as structureName";

        neo.execute(query, new JsonObject(), Neo4jResult.validResultHandler(event -> {
            if (event.isLeft()) {
                log.error("[Mediacentre@DefaultPinsService::getStructureParentInfos] Failed to get structures parents : " + event.left().getValue());
                promise.fail(event.left().getValue());
                return;
            }
            JsonArray formattedResources = resources.stream()
                    .map(JsonObject.class::cast)
                    .map(resource -> {
                        event.right().getValue().stream()
                            .map(JsonObject.class::cast)
                            .filter(structure -> Objects.equals(structure.getString(Field.IDSTRUCTURE), resource.getString(Field.STRUCTURE_OWNER)))
                            .findFirst()
                            .ifPresent(structure -> resource.put(Field.IS_PARENT, true));
                        return resource;
                    })
                    .collect(Collectors.collectingAndThen(Collectors.toList(), JsonArray::new));

            promise.complete(formattedResources);
        }));
        return promise.future();
    }

    // Check if the structure is a parent structure (structure who have no parent)
    @Override
    public Future<Boolean> structureIsParent(String structureId) {
        Promise<Boolean> promise = Promise.promise();
        String query = "MATCH (s:Structure) " +
        "OPTIONAL MATCH (s)-[r:HAS_ATTACHMENT]->(ps:Structure) " +
        "WITH s " +
        "WHERE ps IS NULL AND s.id = {structureId} " +
        "RETURN COUNT(s) > 0 AS isTargetStructure";
        JsonObject params = new JsonObject().put(Field.STRUCTURE_ID, structureId);
        neo.execute(query, params, Neo4jResult.validUniqueResultHandler(event -> {
            if (event.isLeft()) {
                log.error("[Mediacentre@DefaultPinsService::structureIsParent] Failed to get structure parent : " + event.left().getValue());
                promise.fail(event.left().getValue());
                return;
            }
            promise.complete(event.right().getValue().getBoolean(Field.IS_TARGET_STRUCTURE));
        }));
        return promise.future();
    }

    private Future<JsonArray> getAllUsersIdsInStructure(String structure) {
        Promise<JsonArray> promise = Promise.promise();
        String query =
            "MATCH (u:User)-[:IN]->(pg:ProfileGroup)-[:DEPENDS]->(s:Structure) " +
            "WHERE s.id = {structure} " +
            "RETURN DISTINCT " +
            "u.id as id";
        JsonObject params = new JsonObject().put(Field.STRUCTURE, structure);
        neo.execute(query, params, Neo4jResult.validResultHandler(event -> {
            if (event.isLeft()) {
                log.error("[Mediacentre@DefaultPinsService::getAllUsersIdsInStructure] Failed to get users in structure : " + event.left().getValue());
                promise.fail(event.left().getValue());
                return;
            }
            JsonArray users = new JsonArray(event.right().getValue().stream()
                    .map(JsonObject.class::cast)
                    .map(json -> json.getString(Field.ID))
                    .collect(Collectors.toList()));
            log.debug("[Mediacentre@DefaultPinsService::getAllUsersIdsInStructure] Users in structure " + structure + " : " + users);
            promise.complete(users);
        }));
        return promise.future();
    }

    // get all users who received the resource
    private Future<JsonArray> retrieveUsersHasShared(String idResource) {
        Promise<JsonArray> promise = Promise.promise();
        String query = "SELECT DISTINCT member_id" +
            " FROM " + Mediacentre.SIGNET_SHARES_TABLE +
            " WHERE resource_id = ?" +
            " GROUP BY member_id;";
        JsonArray params = new JsonArray().add(idResource);
        Sql.getInstance().prepared(query, params, SqlResult.validResultHandler(event -> {
            if (event.isLeft()) {
                log.error("[Mediacentre@DefaultPinsService::retrieveUsersHasShared] Failed to get users who have shared the resource : " + event.left().getValue());
                promise.fail(event.left().getValue());
                return;
            }
            JsonArray users = new JsonArray(event.right().getValue().stream()
                    .map(JsonObject.class::cast)
                    .map(json -> json.getString(Field.MEMBER_ID))
                    .collect(Collectors.toList()));
            promise.complete(users);
        }));
        return promise.future();
    }
}
