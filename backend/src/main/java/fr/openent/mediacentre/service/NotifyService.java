package fr.openent.mediacentre.service;

import io.vertx.core.http.HttpServerRequest;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;

public interface NotifyService {

    /**
     * Send notification when a response is send by a responder
     * @param request request
     * @param users ids of the users to notify
     * @param isParent is parent
     */
    void notifyNewPinnedResource(HttpServerRequest request, JsonArray users, Boolean isParent);
}
