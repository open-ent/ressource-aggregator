package fr.openent.mediacentre.service.impl;

import fr.openent.mediacentre.Mediacentre;
import fr.openent.mediacentre.core.constants.Field;
import fr.openent.mediacentre.enums.ErrorEnum;
import fr.openent.mediacentre.enums.SourceEnum;
import fr.openent.mediacentre.helper.FutureHelper;
import fr.openent.mediacentre.helper.IModelHelper;
import fr.openent.mediacentre.model.SignetResource;
import fr.openent.mediacentre.service.FavoriteService;
import fr.wseduc.mongodb.MongoDb;
import fr.wseduc.webutils.Either;
import fr.wseduc.webutils.Utils;
import io.vertx.core.Future;
import io.vertx.core.Handler;
import io.vertx.core.Promise;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;
import org.entcore.common.mongodb.MongoDbResult;
import org.entcore.common.sql.Sql;
import org.entcore.common.sql.SqlResult;

import java.util.Optional;

import static fr.openent.mediacentre.core.constants.Field.*;

public class DefaultFavoriteService implements FavoriteService {

    private final Logger log = LoggerFactory.getLogger(DefaultFavoriteService.class);
    private final String TOKEN_COLLECTION = "mediacentre.favorite";

    @Override
    public void create(JsonObject favoritesBody, Handler<Either<String, JsonObject>> handler) {
        MongoDb.getInstance().insert(TOKEN_COLLECTION, favoritesBody, message -> {
            Either<String, JsonObject> either = Utils.validResult(message);
            if (either.isRight()) {
                handler.handle(new Either.Right<>(favoritesBody));
            } else {
                String err = "[DefaultFavoriteService@create] Failed to add favorite";
                log.error(err);
                handler.handle(new Either.Left<>(err));
            }
        });
    }

    @Override
    public void get(String source, String userId, Handler<Either<String, JsonArray>> handler) {
        JsonObject matcher = new JsonObject().put("user", userId);
        if (source != null) matcher.put("source", source);
        MongoDb.getInstance().find(TOKEN_COLLECTION, matcher, message -> handler.handle(Utils.validResults(message)));
    }

    @Override
    public Future<JsonObject> create(JsonObject favoritesBody) {
        Promise<JsonObject> promise = Promise.promise();

        this.getByMongoId(favoritesBody.getString(_ID, null))
            .onSuccess(result -> {
                if (!result.isEmpty()) favoritesBody.remove(_ID);
                String errorMessage = "[Mediacentre@DefaultFavoriteService::create] Failed to create favorite in mongo database : ";
                MongoDb.getInstance().insert(TOKEN_COLLECTION, favoritesBody, MongoDbResult.validResultHandler(FutureHelper.handlerJsonObject(promise, errorMessage)));
            })
            .onFailure(err -> {
                String errorMessage = "[Mediacentre@DefaultFavoriteService::create] Failed to check if favorite with same _id already existing in mongo database : ";
                log.error(errorMessage + err.getMessage());
                promise.fail(err.getMessage());
            });

        return promise.future();
    }

    @Override
    public Future<JsonObject> update(String id, JsonObject updateBody) {
        Promise<JsonObject> promise = Promise.promise();

        JsonArray levelArray = new JsonArray();
        if(updateBody.containsKey(LEVELS)) {
            for (int i = 0; i < updateBody.getJsonArray(LEVELS).size(); i++) {
                levelArray.add((updateBody.getJsonArray(LEVELS).getJsonObject(i).getString(LABEL)));
            }
        }
        if(levelArray.isEmpty()) {
            levelArray.add("");
        }

        JsonArray disciplineArray = new JsonArray();
        if(updateBody.containsKey(DISCIPLINES)) {
            for (int i = 0; i < updateBody.getJsonArray(DISCIPLINES).size(); i++) {
                disciplineArray.add((updateBody.getJsonArray(DISCIPLINES).getJsonObject(i).getString(LABEL)));
            }
        }
        if(disciplineArray.isEmpty()) {
            disciplineArray.add("");
        }

        JsonArray plainTextArray = new JsonArray();
        if(updateBody.containsKey(PLAIN_TEXT)) {
            for (int i = 0; i < updateBody.getJsonArray(PLAIN_TEXT).size(); i++) {
                plainTextArray.add((updateBody.getJsonArray(PLAIN_TEXT).getJsonObject(i).getString(LABEL)));
            }
        }
        if(plainTextArray.isEmpty()) {
            plainTextArray.add("");
        }

        updateBody.put(LEVELS, levelArray);
        updateBody.put(DISCIPLINES, disciplineArray);
        updateBody.put(PLAIN_TEXT, plainTextArray);

        JsonObject query = new JsonObject().put(ID, Integer.parseInt(id));
        JsonObject update = new JsonObject().put("$set", updateBody);

        this.getById(id)
            .onSuccess(result -> {
                if (result.isEmpty()) {
                    String errorMessage = "[Mediacentre@DefaultFavoriteService::update] Favorite with id " + id + " not found in mongo database";
                    log.error(errorMessage);
                    promise.fail(errorMessage);
                } else {
                    String errorMessage = "[Mediacentre@DefaultFavoriteService::update] Failed to update favorite in mongo database : ";
                    MongoDb.getInstance().update(TOKEN_COLLECTION, query, update, MongoDbResult.validResultHandler(FutureHelper.handlerJsonObject(promise, errorMessage)));
                }
            })
            .onFailure(err -> {
                String errorMessage = "[Mediacentre@DefaultFavoriteService::update] Failed to check if favorite with id " + id + " existing in mongo database : ";
                log.error(errorMessage + err.getMessage());
                promise.fail(err.getMessage());
            });

        return promise.future();
    }

    private Future<JsonObject> getById(String id) {
        Promise<JsonObject> promise = Promise.promise();

        JsonObject matcher = new JsonObject().put(ID, Integer.parseInt(id));
        String errorMessage = "[Mediacentre@DefaultFavoriteService::getById] Failed to get favorite with id " + id + " in mongo database : ";
        MongoDb.getInstance().findOne(TOKEN_COLLECTION, matcher, MongoDbResult.validResultHandler(FutureHelper.handlerJsonObject(promise, errorMessage)));

        return promise.future();
    }

    private Future<JsonObject> getByMongoId(String mongoId) {
        Promise<JsonObject> promise = Promise.promise();

        JsonObject matcher = new JsonObject().put(_ID, mongoId);
        String errorMessage = "[Mediacentre@DefaultFavoriteService::getByMongoId] Failed to get favorite with _id " + mongoId + " in mongo database : ";
        MongoDb.getInstance().findOne(TOKEN_COLLECTION, matcher, MongoDbResult.validResultHandler(FutureHelper.handlerJsonObject(promise, errorMessage)));

        return promise.future();
    }

    @Override
    public Future<JsonArray> get(String source, String userId) {
        Promise<JsonArray> promise = Promise.promise();

        get(source, userId, event -> {
            if (event.isRight()) {
                promise.complete(event.right().getValue());
            } else {
                String message = String.format("[Mediacentre@%s::get] Error when fetching favorites: %s", this.getClass().getSimpleName(), event.left().getValue());
                log.error(message);
                promise.fail(ErrorEnum.ERROR_FAVORITE_FETCH.method());
            }
        });

        return promise.future();
    }

    @Override
    public void delete(String favoriteId, String source, String userId, Handler<Either<String, JsonObject>> handler) {
        JsonObject matcher = new JsonObject()
                .put(Field.USER, userId)
                .put(Field.SOURCE, source);

        if (source.equals(SourceEnum.SIGNET.method())) {
            matcher.put(ID, Integer.parseInt(favoriteId));
        } else {
            matcher.put(Field._ID, favoriteId);
        }

        MongoDb.getInstance().delete(TOKEN_COLLECTION, matcher, message -> handler.handle(Utils.validResult(message)));
    }

    @Override
    public void createSQL(JsonObject favoritesBody, String userId, Handler<Either<String, JsonObject>> handler) {
        String query = "INSERT INTO " + Mediacentre.FAVORITES_TABLE + " (signet_id, user_id, favorite) VALUES (?, ?, ?) ";
        JsonArray params = new JsonArray()
                .add(favoritesBody.getInteger("id"))
                .add(userId)
                .add(false);
        Sql.getInstance().prepared(query, params, SqlResult.validUniqueResultHandler(handler));
    }

    @Override
    public void updateSQL(int favoriteId, String userId, boolean isFavorite, boolean isShare, Handler<Either<String, JsonObject>> handler) {
        String query;
        JsonArray params = new JsonArray()
                .add(favoriteId)
                .add(userId)
                .add(isFavorite);
        if(isShare) {
            query = "INSERT INTO " + Mediacentre.FAVORITES_TABLE + " (signet_id, user_id, favorite) VALUES (?, ?, ?) " +
                    "ON CONFLICT (signet_id, user_id) DO NOTHING";
        } else {
            query = "INSERT INTO " + Mediacentre.FAVORITES_TABLE + " (signet_id, user_id, favorite) VALUES (?, ?, ?) " +
                    "ON CONFLICT (signet_id, user_id) DO UPDATE SET favorite = ?";
            params.add(isFavorite);
        }

        Sql.getInstance().prepared(query, params, SqlResult.validUniqueResultHandler(handler));
    }

    @Override
    public void getDesactivated(String signetId, JsonArray responders, Handler<Either<String, JsonArray>> handler) {

        JsonArray params = new JsonArray().add(signetId).add(true);
        String query = "SELECT DISTINCT user_id FROM " + Mediacentre.FAVORITES_TABLE + " WHERE signet_id = ? and favorite = ? ";

        if (responders.size() > 0) {
            query += "AND user_id NOT IN (";
            for (Object id : responders) {
                query += "?, ";
                params.add(id.toString());
            }
            query = query.substring(0, query.length() - 2) + ");";
        }

        Sql.getInstance().prepared(query, params, SqlResult.validResultHandler(handler));
    }

    @Override
    public Future<Optional<SignetResource>> createSQL(JsonObject favoritesBody, String userId) {
        Promise<Optional<SignetResource>> promise = Promise.promise();

        String query = "INSERT INTO " + Mediacentre.FAVORITES_TABLE + " (signet_id, user_id, favorite) VALUES (?, ?, ?) RETURNING *";
        JsonArray params = new JsonArray()
                .add(favoritesBody.getInteger(ID))
                .add(userId)
                .add(false);

        String errorMessage = "[Mediacentre@DefaultFavoriteService::createSQL] Failed to create new favorite in SQL database : ";
        Sql.getInstance().prepared(query, params, SqlResult.validUniqueResultHandler(IModelHelper.uniqueResultToIModel(promise, SignetResource.class, errorMessage)));

        return promise.future();
    }

    @Override
    public Future<Optional<SignetResource>> updateSQL(int signetId, String userId, boolean isFavorite, boolean isShare) {
        Promise<Optional<SignetResource>> promise = Promise.promise();

        String query;
        JsonArray params = new JsonArray()
                .add(signetId)
                .add(userId)
                .add(isFavorite);
        if (isShare) {
            query = "INSERT INTO " + Mediacentre.FAVORITES_TABLE + " (signet_id, user_id, favorite) VALUES (?, ?, ?) " +
                    "ON CONFLICT (signet_id, user_id) DO NOTHING" +
                    "RETURNING *";
        }
        else {
            query = "INSERT INTO " + Mediacentre.FAVORITES_TABLE + " (signet_id, user_id, favorite) VALUES (?, ?, ?) " +
                    "ON CONFLICT (signet_id, user_id) DO UPDATE SET favorite = ?" +
                    "RETURNING *";
            params.add(isFavorite);
        }

        String errorMessage = "[Mediacentre@DefaultFavoriteService::updateSQL] Failed to update favorite in SQL database : ";
        Sql.getInstance().prepared(query, params, SqlResult.validUniqueResultHandler(IModelHelper.uniqueResultToIModel(promise, SignetResource.class, errorMessage)));

        return promise.future();
    }

    @Override
    public Future<JsonObject> delete(String favoriteId, String source, String userId) {
        Promise<JsonObject> promise = Promise.promise();

        JsonObject matcher = new JsonObject()
                .put(Field.USER, userId)
                .put(Field.SOURCE, source);

        if (source.equals(SourceEnum.SIGNET.method()) || source.equals(SourceEnum.GLOBAL.method())) {
            matcher.put(ID, Integer.parseInt(favoriteId));
        }
        else {
            matcher.put(Field._ID, favoriteId);
        }

        String errorMessage = "[Mediacentre@DefaultFavoriteService::delete] Failed to delete favorite in mongo database : ";
        MongoDb.getInstance().delete(TOKEN_COLLECTION, matcher, MongoDbResult.validResultHandler(FutureHelper.handlerJsonObject(promise, errorMessage)));

        return promise.future();
    }
}
