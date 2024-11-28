package fr.openent.mediacentre.service;

import io.vertx.core.Future;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.entcore.common.user.UserInfos;

public interface FeaturedResourcesService {

    /**
     * Get featured resources
     * @param user User to get GAR resources
     * @param moduleName the caller module name
     * @return featured resources
     */
    Future<JsonArray> getFeaturedResources(UserInfos user, String moduleName);
}
