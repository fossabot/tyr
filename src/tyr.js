/* eslint-disable import/prefer-default-export,no-await-in-loop,
prefer-destructuring,no-restricted-syntax */
import * as projectService from './services/project-service';
import * as githubService from './services/github-service';
import * as herokuService from './services/heroku-service';
import * as travisService from './services/travis-service';
import * as dockerService from './services/docker-service';
import * as expressService from './services/express-service';
import { getActiveLogger } from './utils/log/winston';

const log = getActiveLogger();

/**
 * Facilitates enabling github for the user. Enables/Creates GitHub repository
 * @configs the configuration object
 * @returns {Promise<void>}
 */
export async function github(configs) {
  const repositoryName = configs.projectConfigurations.projectName;
  const repositoryDescription = configs.projectConfigurations.description;
  const username = configs.credentials.github.username;
  const password = configs.credentials.github.password;

  await githubService.createGitHubRepository(
    repositoryName, repositoryDescription, username,
    password
  );
}

/**
 * Facilitates generating the necessary files for a basic nodejs project
 * @param configs the configurations object
 * @returns {Promise<void>}
 */
export async function generateBasicNodeProject(configs) {
  await projectService.generateBasicNodeFiles(configs);
}

/**
 * Facilitates generating the necessary files for GitHub/Git Support
 * @param configs the configurations object
 * @returns {Promise<void>}
 */
export async function generateGithubFiles(configs) {
  await githubService.generateGithubFiles(configs.projectConfigurations.projectName);
}

/**
 * Facilitates generating the necessary files for TravisCI support
 * @param configs the configurations object
 * @returns {Promise<void>}
 */
export async function generateTravisFiles(configs) {
  await travisService.generateTravisCIFile(configs);
}

/**
 * Facilitates generating the necessary files for Docker support
 * @param configs the configurations object
 * @returns {Promise<void>}
 */
export async function generateDockerFiles(configs) {
  await dockerService.generateDockerFiles(configs.projectConfigurations.projectName);
}

/**
 * Facilitates generating the necessary files for ExpressJS
 * @param configs
 * @returns {Promise<void>}
 */
export async function generateExpressFiles(configs) {
  await expressService.generateExpressFiles(configs.projectConfigurations.projectName);
}

/**
 * Facilitates enabling travis ci for the user.
 * @configs the configuration object
 * @returns {Promise<void>}
 */
export async function travisci(configs) {
  await travisService.enableTravis(configs);
}

/**
 * Facilitates enabling heroku for the user. Creates Heroku App.
 * @param configs the configuration object
 * @returns {Promise<void>}
 */
export async function heroku(configs) {
  const appName = configs.projectConfigurations.projectName;
  const email = configs.credentials.heroku.email;
  const password = configs.credentials.heroku.password;

  await herokuService.createApp(appName, email, password);
}

// The services construct. This object acts as a selector. Add a method to this construct if there
// is a new service to the application. From that method, you can add the functionality to start
// supporting a new third party service.
const services = {
  github,
  travisci,
  heroku
};

// The file generator construct. This object acts as a selector. Add a key/value pair to this
// construct if the new service you are adding requires static files to be generated. The value
// should be a method that should call the file generator.
const staticFileGenerators = {
  github: generateGithubFiles,
  travisci: generateTravisFiles,
  docker: generateDockerFiles,
  expressjs: generateExpressFiles
};

export async function generateProject(configs) {
  try {
    await generateBasicNodeProject(configs);
  } catch (error) {
    log.error(error.message);
    return;
  }

  // generating static files
  try {
    for (const key of Object.keys(configs.toolingConfigurations)) {
      const tool = configs.toolingConfigurations[key];
      if (staticFileGenerators[tool.toLowerCase()]) {
        await staticFileGenerators[tool.toLowerCase()](configs);
      }
    }
  } catch (error) {
    log.error(error.message);
    return;
  }

  // enabling third party tools
  try {
    for (const key of Object.keys(configs.toolingConfigurations)) {
      const tool = configs.toolingConfigurations[key];
      if (services[tool.toLowerCase()]) {
        await services[tool.toLowerCase()](configs);
      }
    }
  } catch (error) {
    log.error(error.message);
  }
}
