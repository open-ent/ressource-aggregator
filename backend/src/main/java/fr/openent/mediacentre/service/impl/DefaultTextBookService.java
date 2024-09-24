package fr.openent.mediacentre.service.impl;

import fr.openent.mediacentre.core.constants.Field;
import fr.openent.mediacentre.helper.FutureHelper;
import fr.openent.mediacentre.helper.IModelHelper;
import fr.openent.mediacentre.model.PinResource;
import fr.openent.mediacentre.service.TextBookService;
import fr.wseduc.mongodb.MongoDb;
import fr.wseduc.webutils.Either;
import io.vertx.core.Future;
import io.vertx.core.Handler;
import io.vertx.core.Promise;
import io.vertx.core.json.Json;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;
import org.entcore.common.mongodb.MongoDbResult;

public class DefaultTextBookService implements TextBookService {
    private final String TEXTBOOK_COLLECTION = "mediacentre.textbooks";
    private final String EXTERNAL_RESOURCES_COLLECTION = "mediacentre.external_resources";
    private static final Logger log = LoggerFactory.getLogger(DefaultTextBookService.class);

    @Override
    public Future<JsonArray> get(String userId) {
        Promise<JsonArray> promise = Promise.promise();
        JsonObject matcher = new JsonObject()
                .put(Field.USER, userId);

        MongoDb.getInstance().find(TEXTBOOK_COLLECTION, matcher, MongoDbResult.validResultsHandler(result -> {
            if (result.isLeft()) {
                log.error("[Mediacentre@DefaultTextbookService::get] Can't retrieve textbooks : " + result.left().getValue());
                promise.fail(result.left().getValue());
                return;
            }
            promise.complete(result.right().getValue());
        }));
        return promise.future();
    }

    @Override
    public Future<JsonArray> getUsersHaveTextbook(String textbookId) {
        Promise<JsonArray> promise = Promise.promise();
        JsonObject matcher = new JsonObject()
                .put(Field.ID, textbookId);

        MongoDb.getInstance().find(TEXTBOOK_COLLECTION, matcher, MongoDbResult.validResultsHandler(FutureHelper.handlerJsonArray(promise, "[Mediacentre@DefaultTextbookService::getUsersHaveTextbook] Can't retrieve users : ")));
        return promise.future();
    }

    @Override
    public Future<JsonArray> getUsersHaveExternalResource(String externalResourceId) {
        Promise<JsonArray> promise = Promise.promise();
        JsonObject matcher = new JsonObject()
                .put(Field.ID, externalResourceId);

        MongoDb.getInstance().find(EXTERNAL_RESOURCES_COLLECTION, matcher, MongoDbResult.validResultsHandler(FutureHelper.handlerJsonArray(promise, "[Mediacentre@DefaultTextbookService::getUsersHaveTextbook] Can't retrieve users : ")));
        return promise.future();
    }

    @Override
    public void insert(String userId, JsonArray textbooks, Handler<Either<String, JsonObject>> handler) {
        for (int i = 0; i < textbooks.size(); i++) {
            JsonObject textbook = textbooks.getJsonObject(i);
            textbook.put("user", userId);
        }

        MongoDb.getInstance().insert(TEXTBOOK_COLLECTION, textbooks, MongoDbResult.validResultHandler(handler));
    }

    @Override
    public Future<Void> insertExternalResources(String userId, JsonArray externalResources) {
        Promise<Void> promise = Promise.promise();
        externalResources.stream()
            .map(JsonObject.class::cast)
            .forEach(externalResource -> externalResource.put(Field.USER, userId));

        MongoDb.getInstance().insert(EXTERNAL_RESOURCES_COLLECTION, externalResources, MongoDbResult.validResultHandler(result -> {
            if (result.isLeft()) {
                log.error("[Mediacentre@DefaultTextbookService::insertExternalResources] Can't insert external resources : " + result.left().getValue());
                promise.fail(result.left().getValue());
                return;
            }
            promise.complete();
        }));
        return promise.future();
    }

    @Override
    public void delete(String userId, Handler<Either<String, JsonObject>> handler) {
        MongoDb.getInstance().delete(TEXTBOOK_COLLECTION, new JsonObject().put("user", userId), MongoDbResult.validResultHandler(handler));
    }

    @Override
    public Future<Void> deleteExternalResources(String userId) {
        Promise<Void> promise = Promise.promise();
        MongoDb.getInstance().delete(EXTERNAL_RESOURCES_COLLECTION, new JsonObject().put(Field.USER, userId), MongoDbResult.validResultHandler(FutureHelper.handlerJsonObjectVoid(promise, "[Mediacentre@DefaultTextbookService::deleteExternalResources] Can't delete external resources : ")));
        return promise.future();
    }
}
