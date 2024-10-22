import "dotenv/config";

const host = "127.0.0.1"; // ip of the infoscreen interface, use external address if not develoment
const port = 8000; // port for infoscreen

let hostUrl = "http://" + (process.env.HOST || host) + ":" + (process.env.PORT || port);
if (process.env.FRONT_PROXY == "true") hostUrl = "https://" + (process.env.HOST || host);

export default {
    serverListenPort: process.env.PORT || port,
    serverHost: process.env.HOST || host,
    serverUrl: hostUrl,
    sessionKey: process.env.SESSIONKEY || "generateSecret", // used for encrypting cookies
    streamKey: process.env.STREAMKEY || "INFOSCREEN3", // stream key for rtmp end point
    useLocalAssets: false, // used to load javascript libraries locally from /public/assets
    mediaServer: process.env.MEDIASERVER == "true" ? true : false, // local streaming server for rtmp, see docs how to use
    defaultLocale: process.env.LOCALE || "de", // currently supported values are: "en","fi, de"
    accesskey: process.env.ACCESSKEY || false,
    /*
     * Plugins
     */
    plugins: [
        // "profiler", // display memory statistics at console.
    ],

    /*
     * Users
     */
    admins: [
        {
            id: 1,
            displayName: "Administrator",
            username: process.env.ADMIN_USER || "admin",
            password: process.env.ADMIN_PASS || "admin",
            /*
             * Permissions:
             *
             * isAdmin - can access admin portal
             * dashboard.manageBundles - can create and edit bundles (TODO: also disable item actions)
             * dashboard.addNewContent - can add new slides to bundle
             * dashboard.editContent - can edit existing slides (TODO)
             * dashboard.deleteContent - can remove existing slides (TODO)
             */
            permissions: {
                isAdmin: true,
                dashboard: {
                    manageBundles: true,
                    addNewContent: true,
                    editContent: true,
                    deleteContent: true,
                },
            },
        },
        {
            id: 2,
            displayName: "Display Viewer",
            username: process.env.USER || "view",
            password: process.env.PASS || "view",
            permissions: {
                isAdmin: false,
            },
        },
    ],
    displays: [
        {
            name: "Main Screen",
            bundle: "default",
        },
    ],
};
