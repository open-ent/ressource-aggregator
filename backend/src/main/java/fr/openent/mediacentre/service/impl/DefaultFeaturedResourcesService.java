package fr.openent.mediacentre.service.impl;

import fr.openent.mediacentre.helper.IModelHelper;
import fr.openent.mediacentre.model.FeaturedResource;
import fr.openent.mediacentre.service.FeaturedResourcesService;
import fr.openent.mediacentre.source.GAR;
import fr.openent.mediacentre.source.Source;
import fr.wseduc.mongodb.MongoDb;
import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.entcore.common.mongodb.MongoDbResult;
import org.entcore.common.user.UserInfos;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static fr.openent.mediacentre.core.constants.Field.*;

public class DefaultFeaturedResourcesService implements FeaturedResourcesService {

    private static final Logger log = LoggerFactory.getLogger(DefaultFeaturedResourcesService.class);
    private final List<Source> sources;

    public DefaultFeaturedResourcesService(List<Source> sources) {
        this.sources = sources;
    }

    private Future<JsonArray> getResourcesFromGar(UserInfos user) {
        Promise<JsonArray> promise = Promise.promise();

        GAR garSource = this.sources.stream()
                .filter(GAR.class::isInstance)
                .map(GAR.class::cast)
                .findFirst()
                .orElse(null);
        if (garSource == null) {
            log.error("[Mediacentre@DefaultFeaturedResourcesService::getResourcesFromGar] Failed to get GAR source");
            promise.fail("Failed to get GAR source");
        } else {
            garSource.getAllUserResources(user)
                    .onSuccess(promise::complete)
                    .onFailure(e -> {
                        log.error("[Mediacentre@DefaultFeaturedResourcesService::getResourcesFromGar] failed to get user resources from GAR: " + e.getMessage());
                        promise.fail(e.getMessage());
                    });
        }
        return promise.future();
    }

    private Future<List<FeaturedResource>> getFeaturedResourcesFromMongo(String moduleName) {
        Promise<List<FeaturedResource>> promise = Promise.promise();
        String error = "[Mediacentre@DefaultFeaturedResourcesService::getFeaturedResourcesFromMongo] Failed to get featured resources from Mongo";
        JsonObject matcher = new JsonObject()
                .put(MODULE, moduleName);

        MongoDb.getInstance().find(FEATURED_COLLECTION, matcher, MongoDbResult.validResultsHandler(IModelHelper.resultToIModel(promise, FeaturedResource.class, error)));
        return promise.future();
    }


    public Future<JsonArray> getFeaturedResources(UserInfos user, String moduleName) {
        Promise<JsonArray> promise = Promise.promise();
        Future<List<FeaturedResource>> featuredFromMongo = getFeaturedResourcesFromMongo(moduleName);
        Future<JsonArray> featuredFromSource = getResourcesFromGar(user);

        featuredFromMongo
                .compose(mongoResult ->
                        featuredFromSource.map(sourceResult -> combineResources(sourceResult, mongoResult))
                )
                .onSuccess(promise::complete)
                .onFailure(e -> {
                    log.error("[Mediacentre@DefaultFeaturedResourcesService::getFeaturedResources] Failed to combine resources: " + e.getMessage());
                    promise.fail(e.getMessage());
                });

        return promise.future();
    }

    private JsonArray combineResources(JsonArray sourceResources, List<FeaturedResource> mongoResources) {
        Map<String, String> mongoDescriptions = mongoResources.stream()
                .filter(res -> res.getResourceId() != null)
                .collect(Collectors.toMap(FeaturedResource::getResourceId, FeaturedResource::getDescription));

        JsonArray filteredResources = new JsonArray();
        sourceResources.stream()
                .filter(JsonObject.class::isInstance)
                .map(JsonObject.class::cast)
                .filter(resource -> {
                    String resourceId = resource.getString(ID_RESSOURCE, null);
                    return resourceId != null && mongoDescriptions.containsKey(resourceId);
                })
                .forEach(resource -> {
                    JsonObject combinedResource = new JsonObject()
                            .put(ID_RESSOURCE, resource.getString(ID_RESSOURCE, null))
                            .put(NOM_RESSOURCE, resource.getString(NOM_RESSOURCE, null))
                            .put(URL_ACCES_RESSOURCE, resource.getString(URL_ACCES_RESSOURCE, null))
                            .put(URL_VIGNETTE, resource.getString(URL_VIGNETTE, null))
                            .put(DESCRIPTION, mongoDescriptions.get(resource.getString(ID_RESSOURCE, null)));
                    filteredResources.add(combinedResource);
                });
        return filteredResources;
    }


}
