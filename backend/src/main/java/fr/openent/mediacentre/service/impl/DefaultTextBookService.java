package fr.openent.mediacentre.service.impl;

import fr.openent.mediacentre.helper.FutureHelper;
import fr.openent.mediacentre.helper.IModelHelper;
import fr.openent.mediacentre.model.PinResource;
import fr.openent.mediacentre.service.TextBookService;
import fr.wseduc.mongodb.MongoDb;
import fr.wseduc.webutils.Either;
import io.vertx.core.Future;
import io.vertx.core.Handler;
import io.vertx.core.Promise;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;
import org.entcore.common.mongodb.MongoDbResult;

public class DefaultTextBookService implements TextBookService {
    private final String TEXTBOOK_COLLECTION = "mediacentre.textbooks";
    private static final Logger log = LoggerFactory.getLogger(DefaultTextBookService.class);

    @Override
    public Future<JsonArray> get(String userId) {
        Promise<JsonArray> promise = Promise.promise();
        JsonObject matcher = new JsonObject()
                .put("user", userId);

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
    public void insert(String userId, JsonArray textbooks, Handler<Either<String, JsonObject>> handler) {
        for (int i = 0; i < textbooks.size(); i++) {
            JsonObject textbook = textbooks.getJsonObject(i);
            textbook.put("user", userId);
        }

        MongoDb.getInstance().insert(TEXTBOOK_COLLECTION, textbooks, MongoDbResult.validResultHandler(handler));
    }

    @Override
    public void delete(String userId, Handler<Either<String, JsonObject>> handler) {
        MongoDb.getInstance().delete(TEXTBOOK_COLLECTION, new JsonObject().put("user", userId), MongoDbResult.validResultHandler(handler));
    }
}
