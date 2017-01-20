let express = require('express'),
    bodyParser = require('body-parser');

class RealmServer {

    constructor(realm, port) {
        this.realm = realm;
        this.port = port;
        this.app = express();

        this.configureMiddleWare();
        this.configureRoutes();
        this.listen();
    }

    configureMiddleWare() {
        this.app.use(bodyParser.json());
    }

    configureRoutes() {
        for (let objectSchema of this.realm.schema) {
            this.configureRoute(objectSchema);
        }
    }

    configureRoute(objectSchema) {
        let basePath = '/' + objectSchema.name.toLowerCase();
        this.configureGetPrimaryRoute(objectSchema, basePath);
        this.configureGetRoute(objectSchema, basePath);
        this.configureCreateRoute(objectSchema, basePath);
        this.configureUpdateRoute(objectSchema, basePath);
        this.configureDeleteRoute(objectSchema, basePath);
    }

    configureGetPrimaryRoute(objectSchema, basePath) {
        if (typeof objectSchema.primaryKey !== 'undefined') {
            this.app.get(basePath + '/:id', ((request, response) => {
                let result = this.findOneBy(objectSchema.name, objectSchema.primaryKey, request.params.id);
                if (!result) {
                    response.status(404).end();
                } else {
                    response.json(result);
                }
            }).bind(this));
        }
    }

    configureGetRoute(objectSchema, basePath) {
        // TODO: Pluralise basePath
        let self = this;
        this.app.get(basePath, ((request, response) => {
            let results = self.findAllBy(objectSchema.name);
            response.json(results);
        }));
    }

    configureCreateRoute(objectSchema, basePath) {
        this.app.post(basePath, ((request, response) => {
            let realm = this.realm,
                object = this.setNextId(request.body, objectSchema);
            try {
                realm.write(() => {
                    realm.create(objectSchema.name, object);
                });
                response.json(object);
            } catch (e) {
                response.status(400).send(e.message);
                throw e;
            }
        }).bind(this));
    }

    configureUpdateRoute(objectSchema, basePath) {
        this.app.put(basePath, ((request, response) => {
            let realm = this.realm;
            realm.write(() => {
                realm.create(objectSchema.name, request.body, true);
            });
            response.json(request.body);
        }).bind(this));
    }

    configureDeleteRoute(objectSchema, basePath) {
        this.app.delete(basePath + '/:id', ((request, response) => {
            let filter = {};
            filter[objectSchema.primaryKey] = request.params.id;
            let result = this.findOneBy(objectSchema.name, filter);
            if (result === null) {
                response.status(404).end();
            } else {
                let realm = this.realm;
                realm.write(() => {
                    realm.delete(result);
                });
                response.status(200).end();
            }
        }).bind(this));
    }

    findAllBy(name, filters, limit, offset) {
        let results = this.realm.objects(name);
        if (typeof filters === 'object') {
            for (let key in filters) {
                if (typeof key === 'string') {
                    results = results.filtered(key + ' = "' + filters[key] + '"');
                }
            }
        } else if (typeof filters === 'string') {
            results = results.filtered(filters);
        }
        if (typeof limit === 'number' || typeof offset === 'number') {
            offset = typeof offset !== 'number' ? 0 : offset;
            limit = typeof limit !== 'number' ? 20 : limit;
            results = results.slice(offset, offset + limit);
        }
        return results.map(x => x);
    }

    findOneBy(name, filters) {
        let results = this.findAllBy(name, filters);
        return results.length > 0 ? results[0] : null;
    }

    listen() {
        this.app.listen(this.port, () => {
            console.log('RealmServer now listening on port 3030');
        });
    }

    /**
     * Set the primary key value.
     * Only if configured to have one, that's a number, and there isn't one already set
     *
     * @param object
     * @param objectSchema
     * @returns {*}
     */
    setNextId(object, objectSchema) {
        // Only set if there's a primary key configured
        if (typeof objectSchema.primaryKey === 'string' &&
            typeof objectSchema.properties[objectSchema.primaryKey] !== 'undefined') {
            let primaryKeyProperty = objectSchema.properties[objectSchema.primaryKey],
                primaryKeyType;
            // Get the primary key type from an object
            if (typeof primaryKeyProperty === 'object' && typeof primaryKeyProperty.type === 'string') {
                primaryKeyType = primaryKeyProperty.type;

            // Get the primary key type from a string
            } else if (typeof primaryKeyProperty === 'string') {
                primaryKeyType = primaryKeyProperty;
            }

            // If a primary key type if set and is a number
            if (primaryKeyType && typeof primaryKeyType === 'string' && primaryKeyType === 'int') {
                // If the primary key isn't already set
                if (typeof object[objectSchema.primaryKey] === 'undefined') {
                    let values = this.realm.objects(objectSchema.name);
                    if (values.length == 0) {
                        object[objectSchema.primaryKey] = 1;
                    } else {
                        object[objectSchema.primaryKey] =
                            values.sorted(objectSchema.primaryKey, true)[0][objectSchema.primaryKey] + 1;
                    }
                }
            }
        }
        return object;
    }

}

module.exports = RealmServer;