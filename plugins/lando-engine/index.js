'use strict';

module.exports = lando => {
  // Modules
  const _ = lando.node._;
  const env = require('./lib/env.js');
  const fs = lando.node.fs;
  const ip = require('ip');
  const path = require('path');
  const url = require('url');

  // Add some config for the engine
  lando.events.on('post-bootstrap', 1, lando => {
    // Log
    lando.log.info('Configuring engine plugin');

    // Engine script directory
    const esd = path.join(lando.config.userConfRoot, 'engine', 'scripts');
    const host = (process.platform === 'linux') ? ip.address() : 'host.docker.internal';

    // Build the default config object
    const defaultEngineConfig = {
      composeBin: env.getComposeExecutable(),
      composeVersion: '3.2',
      containerGlobalEnv: {},
      dockerBin: env.getDockerExecutable(),
      dockerBinDir: env.getDockerBinPath(),
      engineId: lando.user.getUid(),
      engineGid: lando.user.getGid(),
      engineScriptsDir: esd,
    };

    // Merge defaults over the config, this allows users to set their own things
    lando.config = lando.utils.config.merge(defaultEngineConfig, lando.config);

    // Strip all DOCKER_ and COMPOSE_ envvars
    lando.config.env = lando.utils.config.stripEnv('DOCKER_');
    lando.config.env = lando.utils.config.stripEnv('COMPOSE_');

    // Set up the default engine config if needed
    if (!_.has(lando.config, 'engineConfig')) {
      // Set the defaults
      lando.config.engineConfig = {
        socketPath: '/var/run/docker.sock',
        host: '127.0.0.1',
        port: 2376,
      };

      // Slight deviation on Windows due to npipe://
      if (process.platform === 'win32') {
        lando.config.engineConfig.socketPath = '//./pipe/docker_engine';
      }
    }

    // Set the docker host if its non-standard
    if (lando.config.engineConfig.host !== '127.0.0.1') {
      lando.config.env.DOCKER_HOST = url.format({
        protocol: 'tcp',
        slashes: true,
        hostname: lando.config.engineConfig.host,
        port: lando.config.engineConfig.port || 2376,
      });
    }

    // Set the TLS/cert things if needed
    if (_.has(lando.config.engineConfig, 'certPath')) {
      const certPath = lando.config.engineConfig.certPath;
      lando.config.env.DOCKER_CERT_PATH = certPath;
      lando.config.env.DOCKER_TLS_VERIFY = 1;
      lando.config.engineConfig.ca = fs.readFileSync(path.join(certPath, 'ca.pem'));
      lando.config.engineConfig.cert = fs.readFileSync(path.join(certPath, 'cert.pem'));
      lando.config.engineConfig.key = fs.readFileSync(path.join(certPath, 'key.pem'));
    }

    // Set the ENV
    lando.config.env.LANDO_ENGINE_CONF = lando.config.userConfRoot;
    lando.config.env.LANDO_ENGINE_ID = lando.config.engineId;
    lando.config.env.LANDO_ENGINE_GID = lando.config.engineGid;
    lando.config.env.LANDO_ENGINE_HOME = lando.config.home;
    lando.config.env.LANDO_ENGINE_IP = lando.config.engineConfig.host;
    lando.config.env.LANDO_ENGINE_REMOTE_IP = host;
    lando.config.env.LANDO_ENGINE_SCRIPTS_DIR = lando.config.engineScriptsDir;

    // Add some docker compose protection on windows
    if (process.platform === 'win32') lando.config.env.COMPOSE_CONVERT_WINDOWS_PATHS = 1;

    // Log it
    lando.log.verbose('Engine plugin configured with %j', lando.config);

    // Add utilities
    lando.utils.engine = require('./lib/utils');

    // Move our scripts over and set useful ENV we can use
    const scriptSrc = path.join(__dirname, 'scripts');
    const scriptDest = lando.config.engineScriptsDir;
    lando.log.verbose('Copying config from %s to %s', scriptSrc, scriptDest);
    lando.utils.engine.moveConfig(scriptSrc, scriptDest);
  });

  // Add some config for the engine
  lando.events.on('post-bootstrap', 2, lando => {
    lando.log.info('Initializing engine plugin');
    lando.engine = require('./engine')(lando);
  });
};
