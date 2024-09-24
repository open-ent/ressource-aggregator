package fr.openent.mediacentre.service;

import fr.wseduc.webutils.Either;
import io.vertx.core.Future;
import io.vertx.core.Handler;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;

public interface TextBookService {

    /**
     * Get user textbooks
     *
     * @param userId  User that needs to retrieve textbooks
     */
    Future<JsonArray> get(String userId);

    /**
     * Get all users who have a textbook
     *
     * @param textbookId  textbook id
     */
    Future<JsonArray> getUsersHaveTextbook(String textbookId);

    /**
     * Get all users who have a external resources
     *
     * @param externalResourceId  external resource id
     */
    Future<JsonArray> getUsersHaveExternalResource(String externalResourceId);
    /**
     * Insert multiple textbooks. Used by textbooks initialization
     *
     * @param userId    User that needs to insert textbooks
     * @param textbooks Textbook list to insert
     * @param handler   Function handler returning data
     */
    void insert(String userId, JsonArray textbooks, Handler<Either<String, JsonObject>> handler);

    /**
     * Insert multiple external resources. Used by external resources initialization
     *
     * @param userId    User that needs to insert external resources
     * @param externalResources external resources list to insert
     */
    Future<Void> insertExternalResources(String userId, JsonArray externalResources);

    /**
     * Drop all user textbooks
     *
     * @param userId  User identifier we drop textbooks
     * @param handler Function handler returning data
     */
    void delete(String userId, Handler<Either<String, JsonObject>> handler);

    /**
     * Drop all user external resources
     *
     * @param userId  User identifier we drop textbooks
     */
    public Future<Void> deleteExternalResources(String userId);
}
