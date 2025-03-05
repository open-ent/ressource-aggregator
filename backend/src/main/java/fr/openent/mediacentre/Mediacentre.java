package fr.openent.mediacentre;

import fr.openent.mediacentre.controller.*;
import fr.openent.mediacentre.helper.elasticsearch.ElasticSearch;
import fr.openent.mediacentre.source.Source;
import fr.openent.mediacentre.tasks.AmassTask;
import fr.wseduc.cron.CronTrigger;
import io.vertx.core.Promise;
import io.vertx.core.eventbus.EventBus;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import org.entcore.common.http.BaseServer;
import org.entcore.common.notification.TimelineHelper;
import org.entcore.common.service.impl.SqlCrudService;
import org.entcore.common.share.impl.SqlShareService;
import org.entcore.common.sql.SqlConf;
import org.entcore.common.sql.SqlConfs;

import java.text.ParseException;
import java.util.ArrayList;
import java.util.List;

public class Mediacentre extends BaseServer {

    public static int wsPort;
    public static final String VIEW_RIGHT = "mediacentre.view";
    public static final String CREATION_RIGHT = "mediacentre.signets.creation";
    public static final String SIGNET_RIGHT = "mediacentre.signets";
    public static final String PIN_MANAGER_RIGHT = "mediacentre.pins.manager";
    public static final String GAR_RIGHT = "mediacentre.gar_ressources";
    public static String mediacentreSchema;
    public static JsonObject mediacentreConfig;
    public static String SIGNET_SHARES_TABLE;
    public static String SIGNET_TABLE;
    public static String MEMBERS_TABLE;
    public static String FAVORITES_TABLE;


    public static String DIRECTORY_BUS_ADDRESS = "directory";

    public static String MEDIACENTRE_VIEW = "fr.openent.mediacentre.controller.MediacentreController|view";
    public static String MEDIACENTRE_CREATE = "fr.openent.mediacentre.source.Signet|create";
    public static String MEDIACENTRE_DELETE = "fr.openent.mediacentre.source.Signet|delete";
    public static String MEDIACENTRE_UPDATE = "fr.openent.mediacentre.source.Signet|update";

    public static final String VIEW_RESOURCE_RIGHT = "mediacentre.contrib";
    public static final String MANAGER_RESOURCE_RIGHT = "mediacentre.manager";

    public static final String VIEW_RESOURCE_BEHAVIOUR = "fr-openent-mediacentre-controller-MediacentreController|initViewResourceRight";
    public static final String MANAGER_RESOURCE_BEHAVIOUR = "fr-openent-mediacentre-controller-MediacentreController|initManagerResourceRight";

    @Override
    public void start(Promise<Void> startPromise) throws Exception {
        super.start(startPromise);

        EventBus eb = getEventBus(vertx);
        wsPort = config.getInteger("wsPort", 3000);
        mediacentreSchema = config.getString("db-schema");
        SIGNET_SHARES_TABLE = mediacentreSchema + ".signet_shares";
        SIGNET_TABLE = mediacentreSchema + ".signet";
        MEMBERS_TABLE = mediacentreSchema + ".members";
        FAVORITES_TABLE = mediacentreSchema + ".favorites";
        mediacentreConfig = config;

        /* Add All sources based on module configuration */
        List<Source> sources = new ArrayList<>();
        JsonObject configSources = config.getJsonObject("sources", new JsonObject());
        List<String> sourceNames = new ArrayList<>(configSources.fieldNames());
        for (String sourceName : sourceNames) {
            if (configSources.getBoolean(sourceName)) {
                Source source = (Source) Class.forName(sourceName).newInstance();
                source.setEventBus(eb);
                source.setConfig(config);
                sources.add(source);
            }
        }
        SqlConf signetConf = SqlConfs.createConf(SignetController.class.getName());
        signetConf.setSchema("mediacentre");
        signetConf.setTable("signet");
        signetConf.setShareTable("signet_shares");

        SqlConf publishedConf = SqlConfs.createConf(PublishedController.class.getName());
        publishedConf.setSchema("mediacentre");
        publishedConf.setTable("signet");
        publishedConf.setShareTable("signet_shares");

        SignetController signetController = new SignetController(eb, securedActions);
        signetController.setShareService(new SqlShareService(mediacentreSchema, "signet_shares", eb, securedActions, null));
        signetController.setCrudService(new SqlCrudService(mediacentreSchema, "signet", "signet_shares"));

        TimelineHelper timelineHelper = new TimelineHelper(vertx, eb, config);

        addController(new MediacentreController(sources, config));
        addController(new FeaturedResourcesController(eb, sources));
        addController(new FavoriteController(eb, sources, securedActions));
        addController(new PublishedController(eb, securedActions));
        addController(new SearchController(eb, sources));
        addController(new TextBooksController(eb, sources));
        addController(new GlobalResourceController(eb));
        addController(new PinsController(eb, sources, securedActions, timelineHelper));
        addController(signetController);

        if (this.config.getBoolean("elasticsearch", false)) {
            if (this.config.getJsonObject("elasticsearchConfig") != null) {
                ElasticSearch.getInstance().init(this.vertx, this.config.getJsonObject("elasticsearchConfig"));
            }
        }

        try {
            AmassTask amassTask = new AmassTask(sources);
            new CronTrigger(vertx, config.getString("amass-cron", "0 1 * * * ? *")).schedule(amassTask);
        } catch (ParseException e) {
            log.fatal("Unable to parse amass cron expression");
            throw e;
        }

        startPromise.tryComplete();
        startPromise.tryFail("[Mediacentre@Mediacentre::start] Failed to start module Mediacentre.");
    }

}
