package fr.openent.mediacentre.service;

import fr.openent.mediacentre.model.FeaturedResource;
import io.vertx.core.Future;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.entcore.common.user.UserInfos;

import java.util.List;

public interface FeaturedResourcesService {

    /**
     * Get featured resources
     * @param user User to get GAR resources
     * @param moduleName the caller module name
     * @return featured resources
     */
    Future<JsonArray> getFeaturedResources(UserInfos user, String moduleName);

    Future<List<FeaturedResource>> addFeaturedResource(List<FeaturedResource> resource);

    Future<JsonObject> deleteFeaturedResource(String idRessource);

    Future<List<FeaturedResource>> getFeaturedResourcesFromMongo(String moduleName);
}
