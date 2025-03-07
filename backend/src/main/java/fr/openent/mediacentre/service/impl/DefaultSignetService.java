package fr.openent.mediacentre.service.impl;

import fr.openent.mediacentre.Mediacentre;
import fr.openent.mediacentre.core.constants.Field;
import fr.openent.mediacentre.helper.ElasticSearchHelper;
import fr.openent.mediacentre.helper.FutureHelper;
import fr.openent.mediacentre.helper.IModelHelper;
import fr.openent.mediacentre.model.SignetResource;
import fr.openent.mediacentre.service.SignetService;
import fr.openent.mediacentre.source.Signet;
import fr.wseduc.webutils.Either;
import fr.wseduc.webutils.security.SecuredAction;
import io.vertx.core.Future;
import io.vertx.core.Handler;
import io.vertx.core.Promise;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.core.logging.Logger;
import io.vertx.core.logging.LoggerFactory;
import org.entcore.common.share.ShareNormalizer;
import org.entcore.common.sql.Sql;
import org.entcore.common.sql.SqlResult;
import org.entcore.common.user.UserInfos;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import static fr.openent.mediacentre.core.constants.Field.*;

public class DefaultSignetService implements SignetService {

    private static final Logger log = LoggerFactory.getLogger(DefaultSignetService.class);
    private final ShareNormalizer shareNormalizer;

    public DefaultSignetService(Map<String, SecuredAction> securedActions) {
        this.shareNormalizer = new ShareNormalizer(securedActions);
    }

    public DefaultSignetService() {
        shareNormalizer = null;
    }

    public Optional<UserInfos> getCreatorForModel(final JsonObject json) {
        if(!json.containsKey(Field.OWNER_ID)) {
            return Optional.empty();
        }
        final UserInfos user = new UserInfos();
        user.setUserId(json.getString(Field.OWNER_ID));
        user.setUsername(json.getString(Field.OWNER_NAME));
        return Optional.of(user);
    }

    private JsonObject addNormalizedShares(final JsonObject signet) {
        try {
            if (signet != null) {
                assert this.shareNormalizer != null;
                this.shareNormalizer.addNormalizedRights(signet, e -> getCreatorForModel(e).map(UserInfos::getUserId));
            }
            return signet;
        }
        catch (Exception e) {
            log.error(String.format("[Mediacentre@%s::addNormalizedShares] Failed to apply normalized shares : %s", this.getClass().getSimpleName(), e.getMessage()));
            return signet;
        }
    }

    @Override
    public Future<JsonArray> list(List<String> groupsAndUserIds, UserInfos user) {
        Promise<JsonArray> promise = Promise.promise();
        JsonArray params = new JsonArray().add(user.getUserId()).add(user.getUserId()).add(user.getUserId());
        String query = "SELECT DISTINCT s.id, s.resource_id, discipline_label as disciplines, level_label as levels, key_words as plain_text, " +
                "title, imageurl as image, s.owner_name, s.owner_id, url, date_creation, date_modification, collab, archived, orientation, " +
                "CASE WHEN f.favorite = true and f.user_id = ? AND s.id = f.signet_id THEN true else false END as favorite, published " +
                "FROM " + Mediacentre.SIGNET_TABLE + " s " +
                "LEFT JOIN " + Mediacentre.SIGNET_SHARES_TABLE + " ss ON s.id = ss.resource_id " +
                "LEFT JOIN " + Mediacentre.MEMBERS_TABLE + " m ON (ss.member_id = m.id AND m.group_id IS NOT NULL) " +
                "LEFT JOIN " + Mediacentre.FAVORITES_TABLE + " f on (f.signet_id = s.id and f.user_id = ?) " +
                "WHERE f.user_id = ? AND s.owner_id = ? OR (ss.member_id IN " + Sql.listPrepared(groupsAndUserIds.toArray());
        for (String groupOrUser : groupsAndUserIds) {
            params.add(groupOrUser);
        }
        query += " AND (ss.action = ? OR ss.action = ?)) ORDER BY s.id desc;";
        params.add(user.getUserId()).add(Mediacentre.MANAGER_RESOURCE_BEHAVIOUR).add(Mediacentre.VIEW_RESOURCE_BEHAVIOUR);

        Sql.getInstance().prepared(query, params, SqlResult.validResultHandler(result -> {
            if(result.isLeft()) {
                promise.fail(result.left().getValue());
                return;
            }
            getSignetSharedRights(result.right().getValue())
                .onSuccess(signets -> promise.complete(
                    new JsonArray(result.right().getValue()
                        .stream()
                        .map(signet -> addNormalizedShares((JsonObject) signet))
                        .collect(Collectors.toList())))
                )
                .onFailure(promise::fail);
        }));
        return promise.future();
    }

    @Override
    public void listSentForms(UserInfos user, Handler<Either<String, JsonArray>> handler) {
        String query = "SELECT * FROM " + Mediacentre.SIGNET_TABLE +
                " ORDER BY title;";
        JsonArray params = new JsonArray().add(user.getUserId()).add(true);
        Sql.getInstance().prepared(query, params, SqlResult.validResultHandler(handler));
    }

    @Override
    public void get(String signetId, Handler<Either<String, JsonObject>> handler) {
        String query = "SELECT id, resource_id, discipline_label as disciplines, level_label as levels, key_words as plain_text, "+
                "title, imageurl as image, owner_name, owner_id, url, date_creation, date_modification, collab, archived, orientation FROM " + Mediacentre.SIGNET_TABLE + " WHERE id = ?;";
        JsonArray params = new JsonArray().add(signetId);
        Sql.getInstance().prepared(query, params, SqlResult.validUniqueResultHandler(handler));
    }

    @Override
    public void create(JsonObject signet, UserInfos user, Handler<Either<String, JsonObject>> handler) {

        JsonArray levelArray = new JsonArray();
        if(signet.containsKey("levels")) {
            for (int i = 0; i < signet.getJsonArray("levels").size(); i++) {
                levelArray.add((signet.getJsonArray("levels").getJsonObject(i).getString("label")));
            }
        }
        if(levelArray.isEmpty()) {
            levelArray.add("");
        }

        JsonArray disciplineArray = new JsonArray();
        if(signet.containsKey("disciplines")) {
            for (int i = 0; i < signet.getJsonArray("disciplines").size(); i++) {
                disciplineArray.add((signet.getJsonArray("disciplines").getJsonObject(i).getString("label")));
            }
        }
        if(disciplineArray.isEmpty()) {
            disciplineArray.add("");
        }

        JsonArray plainTextArray = new JsonArray();
        if(signet.containsKey("plain_text")) {
            for (int i = 0; i < signet.getJsonArray("plain_text").size(); i++) {
                plainTextArray.add((signet.getJsonArray("plain_text").getJsonObject(i).getString("label")));
            }
        }
        if(plainTextArray.isEmpty()) {
            plainTextArray.add("");
        }

        String query = "INSERT INTO " + Mediacentre.SIGNET_TABLE + " (resource_id, discipline_label, level_label, key_words, title, " +
                "imageurl, owner_name, owner_id, url, date_creation, date_modification, orientation) " +
                "VALUES (?, " + Sql.arrayPrepared(disciplineArray) + " ," + Sql.arrayPrepared(levelArray) + " ," + Sql.arrayPrepared(plainTextArray) + ", ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *;";
        JsonArray params = new JsonArray()
                .add(signet.getString("id"))
                .addAll(disciplineArray)
                .addAll(levelArray)
                .addAll(plainTextArray)
                .add(signet.getString("title", ""))
                .add(signet.getString("image", ""))
                .add(user.getLastName() + " " + user.getFirstName())
                .add(user.getUserId())
                .add(signet.getString("url"))
                .add("NOW()").add("NOW()")
                .add(signet.getBoolean("orientation", false));

        Sql.getInstance().prepared(query, params, SqlResult.validUniqueResultHandler(handler));
    }

    @Override
    public Future<JsonObject> update(String signetId, JsonObject signet) {
        Promise<JsonObject> promise = Promise.promise();
        JsonArray levelArray = new JsonArray();
        if(signet.containsKey(LEVELS)) {
            for (int i = 0; i < signet.getJsonArray(LEVELS).size(); i++) {
                levelArray.add((signet.getJsonArray(LEVELS).getJsonObject(i).getString(LABEL)));
            }
        }
        if(levelArray.isEmpty()) {
            levelArray.add("");
        }

        JsonArray disciplineArray = new JsonArray();
        if(signet.containsKey(DISCIPLINES)) {
            for (int i = 0; i < signet.getJsonArray(DISCIPLINES).size(); i++) {
                disciplineArray.add((signet.getJsonArray(DISCIPLINES).getJsonObject(i).getString(LABEL)));
            }
        }
        if(disciplineArray.isEmpty()) {
            disciplineArray.add("");
        }

        JsonArray plainTextArray = new JsonArray();
        if(signet.containsKey(PLAIN_TEXT)) {
            for (int i = 0; i < signet.getJsonArray(PLAIN_TEXT).size(); i++) {
                plainTextArray.add((signet.getJsonArray(PLAIN_TEXT).getJsonObject(i).getString(LABEL)));
            }
        }
        if(plainTextArray.isEmpty()) {
            plainTextArray.add("");
        }

        String query = "UPDATE " + Mediacentre.SIGNET_TABLE + " SET title = ?, imageurl = ?, url = ?, date_modification = ?, " +
                "date_creation = ?, collab = ?, archived = ?, orientation = ?, discipline_label = " + Sql.arrayPrepared(disciplineArray) + ", " +
                "level_label = " + Sql.arrayPrepared(levelArray) +", key_words = "+ Sql.arrayPrepared(plainTextArray) +
                " WHERE id = ? RETURNING *;";

        JsonArray params = new JsonArray()
                .add(signet.getString("title", ""))
                .add(signet.getString("image", ""))
                .add(signet.getString("url", ""))
                .add("NOW()")
                .add(signet.getString("date_creation", "NOW()"))
                .add(signet.getBoolean("collab", false))
                .add(signet.getBoolean("archived", false))
                .add(signet.getBoolean("orientation", false))
                .addAll(disciplineArray)
                .addAll(levelArray)
                .addAll(plainTextArray)
                .add(signetId);

        String errorMessage = "[Mediacentre@DefaultSignetService::update] Failed to update signet : ";
        Sql.getInstance().prepared(query, params, SqlResult.validUniqueResultHandler(FutureHelper.handlerJsonObject(promise, errorMessage)));

        return promise.future();
    }

    public void updateCollab(String signetId, JsonObject signet, Handler<Either<String, JsonObject>> handler) {
        String query = "UPDATE " + Mediacentre.SIGNET_TABLE + " SET collab = ?" +
                " WHERE id = ? RETURNING *;";

        JsonArray params = new JsonArray()
                .add(signet.getBoolean("collab", false))
                .add(signetId);

        Sql.getInstance().prepared(query, params, SqlResult.validUniqueResultHandler(handler));
    }

    @Override
    public void delete(String signetId, Handler<Either<String, JsonObject>> handler) {
        String query = "DELETE FROM " + Mediacentre.SIGNET_TABLE + " WHERE id = ?;";
        JsonArray params = new JsonArray().add(signetId);
        Sql.getInstance().prepared(query, params, SqlResult.validUniqueResultHandler(handler));
    }

    @Override
    public void search(List<String> groupsAndUserIds, UserInfos user, String query, Handler<Either<String, JsonArray>> handler) {
        JsonArray params = new JsonArray().add(user.getUserId()).add(user.getUserId()).add(query).add(user.getUserId());
        String sqlquery = "SELECT DISTINCT s.id, s.resource_id, discipline_label as disciplines, level_label as levels, key_words as plain_text, " +
                "title, imageurl as image, s.owner_name, s.owner_id, url, date_creation, date_modification, collab, archived, orientation, " +
                "CASE WHEN f.favorite = true and f.user_id = ? AND s.id = f.signet_id THEN true else false END as favorite" +
                " FROM " + Mediacentre.SIGNET_TABLE + " s" +
                " LEFT JOIN " + Mediacentre.SIGNET_SHARES_TABLE + " ss ON s.id = ss.resource_id " +
                " LEFT JOIN " + Mediacentre.MEMBERS_TABLE + " m ON (ss.member_id = m.id AND m.group_id IS NOT NULL) " +
                " LEFT JOIN " + Mediacentre.FAVORITES_TABLE + " f on (f.signet_id = s.id and f.user_id = ?) " +
                " WHERE s.title ~* ? AND f.user_id = ? AND (s.owner_id = ? OR (ss.member_id IN " + Sql.listPrepared(groupsAndUserIds.toArray());
        for (String groupOrUser : groupsAndUserIds) {
            params.add(groupOrUser);
        }
        sqlquery += " AND (ss.action = ? OR ss.action = ?))) ORDER BY s.id desc;";
        params.add(user.getUserId()).add(Mediacentre.MANAGER_RESOURCE_BEHAVIOUR).add(Mediacentre.VIEW_RESOURCE_BEHAVIOUR);

        Sql.getInstance().prepared(sqlquery, params, SqlResult.validResultHandler(handler));
    }

    @Override
    public void advancedSearch(List<String> groupsAndUserIds, UserInfos user, Object query, Handler<Either<String, JsonArray>> handler) {
        JsonArray params = new JsonArray().add(user.getUserId()).add(user.getUserId()).add(user.getUserId());
        JsonObject q = ((JsonObject) query);
        String sqlquery = "SELECT DISTINCT s.id, s.resource_id, discipline_label as disciplines, level_label as levels, key_words as plain_text, " +
                "title, imageurl as image, s.owner_name, s.owner_id, url, date_creation, date_modification, collab, archived, orientation, " +
                "CASE WHEN f.favorite = true and f.user_id = ? AND s.id = f.signet_id THEN true else false END as favorite" +
                " FROM " + Mediacentre.SIGNET_TABLE + " s" +
                " LEFT JOIN " + Mediacentre.SIGNET_SHARES_TABLE + " ss ON s.id = ss.resource_id " +
                " LEFT JOIN " + Mediacentre.MEMBERS_TABLE + " m ON (ss.member_id = m.id AND m.group_id IS NOT NULL) " +
                " LEFT JOIN " + Mediacentre.FAVORITES_TABLE + " f on (f.signet_id = s.id and f.user_id = ?) " +
                " WHERE f.user_id = ? AND (s.owner_id = ? OR (ss.member_id IN " + Sql.listPrepared(groupsAndUserIds.toArray());
        for (String groupOrUser : groupsAndUserIds) {
            params.add(groupOrUser);
        }
        sqlquery += " AND (ss.action = ? OR ss.action = ?)))";
        params.add(user.getUserId()).add(Mediacentre.MANAGER_RESOURCE_BEHAVIOUR).add(Mediacentre.VIEW_RESOURCE_BEHAVIOUR);
        if(!(q.getJsonObject("title").getString("value")).equals("")) {
            sqlquery += " AND title ~* ?";
            params.add(q.getJsonObject("title").getString("value"));
        }

        if(!(q.getJsonObject("authors").getString("value")).equals("")) {
            String comparator = q.getJsonObject("authors").getString("comparator").equals("$or") ? " OR" : " AND";
            sqlquery += comparator +  " owner_name ~* ?";
            params.add(q.getJsonObject("authors").getString("value"));
        }

        if(!(q.getJsonObject("editors").getString("value")).equals("")) {
            String comparator = q.getJsonObject("editors").getString("comparator").equals("$or") ? " OR" : " AND";
            sqlquery += comparator +  " owner_name ~* ?";
            params.add(q.getJsonObject("editors").getString("value"));
        }

        if(!(q.getJsonObject("levels").getString("value")).equals("")) {
            String comparator = q.getJsonObject("levels").getString("comparator").equals("$or") ? " OR" : " AND";
            sqlquery += comparator +  " EXISTS ( SELECT * from unnest(level_label) as X where x ~* ? )";
            params.add(q.getJsonObject("levels").getString("value"));
        }

        if(!(q.getJsonObject("disciplines").getString("value")).equals("")) {
            String comparator = q.getJsonObject("disciplines").getString("comparator").equals("$or") ? " OR" : " AND";
            sqlquery += comparator +  " EXISTS ( SELECT * from unnest(discipline_label) as X where x ~* ? )";
            params.add(q.getJsonObject("disciplines").getString("value"));
        }

        sqlquery += "ORDER BY s.id desc;";
        Sql.getInstance().prepared(sqlquery, params, SqlResult.validResultHandler(handler));
    }

    @Override
    public void getMySignetRights(String signetId, List<String> groupsAndUserIds, Handler<Either<String, JsonArray>> handler) {
        String query = "SELECT action FROM " + Mediacentre.SIGNET_SHARES_TABLE +
                " WHERE resource_id = ? AND member_id IN " + Sql.listPrepared(groupsAndUserIds) + " AND action IN (?, ?);";
        JsonArray params = new JsonArray()
                .add(signetId)
                .addAll(new fr.wseduc.webutils.collections.JsonArray(groupsAndUserIds))
                .add(Mediacentre.VIEW_RESOURCE_BEHAVIOUR)
                .add(Mediacentre.MANAGER_RESOURCE_BEHAVIOUR);
        Sql.getInstance().prepared(query, params, SqlResult.validResultHandler(handler));
    }

    @Override
    public Future<JsonArray> getAllMySignetRights(List<String> groupsAndUserIds) {
        Promise<JsonArray> promise = Promise.promise();
        String query = "SELECT resource_id, action FROM " + Mediacentre.SIGNET_SHARES_TABLE +
                " WHERE member_id IN " + Sql.listPrepared(groupsAndUserIds) + " AND action IN (?, ?);";
        JsonArray params = new JsonArray()
                .addAll(new fr.wseduc.webutils.collections.JsonArray(groupsAndUserIds))
                .add(Mediacentre.VIEW_RESOURCE_BEHAVIOUR)
                .add(Mediacentre.MANAGER_RESOURCE_BEHAVIOUR);
        Sql.getInstance().prepared(query, params, SqlResult.validResultHandler(FutureHelper.handlerJsonArray(promise)));
        return promise.future();
    }

    @Override
    public Future<JsonArray> getAllSignetRights() {
        Promise<JsonArray> promise = Promise.promise();
        String query = "SELECT ss.member_id, ss.resource_id, ss.action, m.user_id, m.group_id FROM " + Mediacentre.SIGNET_SHARES_TABLE +
                " ss INNER JOIN " + Mediacentre.MEMBERS_TABLE + " m ON ss.member_id = m.id" +
                " WHERE ss.action IN (?, ?)";
        JsonArray params = new JsonArray()
                .add(Mediacentre.VIEW_RESOURCE_BEHAVIOUR)
                .add(Mediacentre.MANAGER_RESOURCE_BEHAVIOUR);
        Sql.getInstance().prepared(query, params, SqlResult.validResultHandler(FutureHelper.handlerJsonArray(promise)));
        return promise.future();
    }

    public void setPublishValueSignet(String signetId, boolean publishValue, Handler<Either<String, JsonObject>> handler) {
        String query = "UPDATE " + Mediacentre.SIGNET_TABLE + " SET published = ? WHERE id = ?;";
        JsonArray params = new JsonArray().add(publishValue).add(signetId);
        Sql.getInstance().prepared(query, params, SqlResult.validUniqueResultHandler(handler));
    }

    public void getPublicSignet(String userId, Handler<Either<JsonObject, JsonObject>> handler) {
        ElasticSearchHelper.plainTextSearch(Signet.class, ".*", userId, null, false, ElasticSearchHelper.searchHandler(Signet.class, null, handler));
    }

    public void getMyPublishedSignet(String userId, Handler<Either<JsonObject, JsonObject>> handler) {
        ElasticSearchHelper.plainTextSearch(Signet.class, ".*", userId, null, true, ElasticSearchHelper.searchHandler(Signet.class, null, handler));
    }

    public void searchMyPublishedSignet(String query, String userId, Handler<Either<JsonObject, JsonObject>> handler) {
        ElasticSearchHelper.plainTextSearch(Signet.class, query, userId, null, true, ElasticSearchHelper.searchHandler(Signet.class, null, handler));
    }

    public void deleteMyPublishedSignet(String signetId, Handler<Either<JsonObject, JsonObject>> handler) {
        ElasticSearchHelper.deletePublicSignets(signetId, ElasticSearchHelper.searchHandler(Signet.class, null, handler));
    }

    public Future<List<SignetResource>> retrieveFavoriteSignets(UserInfos user) {
        Promise<List<SignetResource>> promise = Promise.promise();
        String query = "SELECT s.* FROM " + Mediacentre.FAVORITES_TABLE + " f " +
                "INNER JOIN " + Mediacentre.SIGNET_TABLE + " s ON s.id = f.signet_id " +
                "WHERE user_id = ? AND favorite = ?;";
        JsonArray params = new JsonArray().add(user.getUserId()).add(true);

        String errorMessage = "[Mediacentre@DefaultSignetService::retrieveFavoriteSignets] Failed to retrieve favorite signets : ";
        Sql.getInstance().prepared(query, params, SqlResult.validResultHandler(IModelHelper.resultToIModel(promise, SignetResource.class, errorMessage)));

        return promise.future();
    }

    private Future<JsonArray> getSignetSharedRights(JsonArray signets) {
        Promise<JsonArray> promise = Promise.promise();
        if (signets == null || signets.isEmpty()) {
            promise.complete(new JsonArray());
            return promise.future();
        }
        getAllSignetRights()
            .onSuccess(rights -> {
                if (rights == null || rights.isEmpty()) {
                    promise.complete(signets);
                    return;
                }
                List<JsonObject> allSignets = signets.stream()
                    .map(JsonObject.class::cast)
                    .map(signet -> signet.put(Field.SHARED, new JsonArray()))
                    .collect(Collectors.toList());
                rights.stream()
                    .map(JsonObject.class::cast)
                    .forEach(right -> {
                        String resourceId = String.valueOf(right.getValue(Field.RESOURCE_ID));
                        allSignets.stream()
                            .filter(signet -> String.valueOf(signet.getValue(Field.ID)).equals(resourceId))
                            .findFirst()
                            .ifPresent(signet -> {
                                JsonArray sharedArray = signet.getJsonArray(Field.SHARED);
                                if (right.getValue(Field.USER_ID) == null) {
                                    Optional<JsonObject> existingShared = sharedArray.stream().filter(JsonObject.class::isInstance)
                                        .map(JsonObject.class::cast)
                                        .filter(shared -> shared.containsKey(Field.GROUPID) && shared.getString(Field.GROUPID).equals(right.getString(Field.GROUP_ID)))
                                        .findFirst();

                                    if (existingShared.isPresent()) {
                                        existingShared.get().put(right.getString(Field.ACTION), true);
                                    } else {
                                        JsonObject newRight = new JsonObject()
                                                .put(Field.GROUPID, right.getString(Field.GROUP_ID))
                                                .put(right.getString(Field.ACTION), true);
                                        sharedArray.add(newRight);
                                    }
                                } else {
                                    Optional<JsonObject> existingShared = sharedArray.stream().filter(JsonObject.class::isInstance)
                                        .map(JsonObject.class::cast)
                                        .filter(shared -> shared.containsKey(Field.USERID) && shared.getString(Field.USERID).equals(right.getString(Field.USER_ID)))
                                        .findFirst();

                                    if (existingShared.isPresent()) {
                                        existingShared.get().put(right.getString(Field.ACTION), true);
                                    } else {
                                        JsonObject newRight = new JsonObject()
                                                .put(Field.USERID, right.getString(Field.USER_ID))
                                                .put(right.getString(Field.ACTION), true);
                                        sharedArray.add(newRight);
                                    }
                                }
                            });
                    });
                promise.complete(allSignets.stream().collect(JsonArray::new, JsonArray::add, JsonArray::addAll));
            })
            .onFailure(promise::fail);
        return promise.future();
    }


}
