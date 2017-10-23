import superagent from 'superagent';
import winston from 'winston';
import chalk from 'chalk';
import * as authorizationUtil from './../utils/authorization';

const tyrAgent = 'Travis/1.0';
const travisApiUrl = 'https://api.travis-ci.org';
const travisApiAccept = 'application/vnd.travis-ci.2+json';

/**
 * Gets the user's account based on the access token provided
 *
 * See https://docs.travis-ci.com/api/#accounts for information about returns.
 *
 * @param travisAccessToken the access token to use to get account information
 * @returns {Promise}
 */
export function getUserAccount(travisAccessToken) {
  winston.log('debug', 'getUserAccount');
  winston.log('verbose', 'getting user account from travis');
  return new Promise((resolve, reject) => {
    superagent
      .get(`${travisApiUrl}/accounts/`)
      .set({
        'User-Agent': tyrAgent,
        Accept: travisApiAccept,
        Authorization: authorizationUtil.tokenAuthorization(travisAccessToken)
      })
      .end((err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res.body);
        }
      });
  });
}

/**
 * Get user information based on the account provided.
 *
 * See https://docs.travis-ci.com/api/#users for information about returns.
 *
 *  @param travisAccessToken the access token to get user information
 * @param account the account to get user information about
 * @returns {Promise}
 */
export async function getUserInformation(travisAccessToken, account) {
  winston.log('debug', 'getUserInformation', account);
  winston.log('verbose', 'getting user information from travis', account.login);

  return new Promise((resolve, reject) => {
    superagent
      .get(`${travisApiUrl}/users/${account.id}`)
      .set({
        'User-Agent': tyrAgent,
        Accept: travisApiAccept,
        Authorization: `token ${travisAccessToken}`
      })
      .end((err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res.body);
        }
      });
  });
}

/**
 * Get github repo id from Travis-CI
 *
 * @param travisAccessToken
 * @param username
 * @param projectName
 * @returns {Promise}
 */
export function getRepositoryId(travisAccessToken, username, projectName) {
  winston.log('debug', 'getRepositoryId', { username, projectName });
  winston.log('verbose', 'getting repository id from travis', { username, projectName });

  return new Promise((resolve, reject) => {
    superagent
      .get(`${travisApiUrl}/repos/${username}/${projectName}`)
      .set({
        'User-Agent': tyrAgent,
        Accept: travisApiAccept,
        Authorization: `token ${travisAccessToken}`
      })
      .end((err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res.body.repo.id);
        }
      });
  });
}

/**
 * Activate Travis hook on a Github repository
 *
 * @param repositoryId
 * @param travisAccessToken
 * @returns {Promise}
 */
export function activateTravisHook(repositoryId, travisAccessToken) {
  winston.log('verbose', 'activateTravisHook', { repositoryId });
  winston.log('verbose', 'activating travis', { repositoryId });

  return new Promise((resolve, reject) => {
    superagent
      .put(`${travisApiUrl}/hooks`)
      .send({
        hook: {
          id: repositoryId,
          active: true
        }
      })
      .set({
        'User-Agent': tyrAgent,
        Accept: travisApiAccept,
        Authorization: `token ${travisAccessToken}`
      })
      .end((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
  });
}

/**
 * Triggers a new sync with GitHub. Needed to see the newly-created repository
 *
 * @param travisAccessToken
 * @returns {Promise}
 */
export function syncTravisWithGithub(travisAccessToken) {
  winston.log('debug', 'syncTravisWithGithub');
  winston.log('verbose', 'syncing travis with github');

  return new Promise((resolve, reject) => {
    superagent
      .post(`${travisApiUrl}/users/sync`)
      .set({
        'User-Agent': tyrAgent,
        Accept: travisApiAccept,
        Authorization: `token ${travisAccessToken}`
      })
      .end((err) => {
        if (err) {
          reject(err);
        } else {
          console.log(chalk.yellow('Please wait while we sync TravisCI with GitHub...'));
          setTimeout(() => {
            resolve();
          }, 10000); // TODO: Find a better way to do this than a timeout.
        }
      });
  });
}

/**
 * Request Travis-CI auth token
 *
 * @param githubToken
 * @returns {Promise}
 */
export function requestTravisToken(githubToken) {
  winston.log('debug', 'requestTravisToken');
  winston.log('verbose', 'requesting token from travis');

  return new Promise((resolve, reject) => {
    superagent
      .post(`${travisApiUrl}/auth/github`)
      .send({ github_token: githubToken })
      .set({
        'User-Agent': tyrAgent,
        Accept: travisApiAccept
      })
      .end((err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res.body.access_token);
        }
      });
  });
}

/**
 * Set environment variables on a Travis-CI project
 *
 * @param travisAccessToken
 * @param repoId
 * @param environmentVariable
 * @returns {Promise}
 */
export function setEnvironmentVariable(travisAccessToken, repoId, environmentVariable) {
  winston.log('debug', 'setEnvironmentVariable', { repoId, environmentVariable });
  winston.log('verbose', 'setEnvironmentVariable', { repoId });

  return new Promise((resolve, reject) => {
    superagent
      .post(`${travisApiUrl}/settings/env_vars`)
      .query({ repository_id: repoId })
      .send({ env_var: environmentVariable })
      .set({
        'User-Agent': tyrAgent,
        Accept: travisApiAccept,
        Authorization: `token ${travisAccessToken}`
      })
      .end((err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(res.body.env_var);
        }
      });
  });
}

/**
 * Set environment variables on a Travis-CI project
 *
 * @param travisAccessToken
 * @param username
 * @param repositoryName
 * @returns Promise (example shown below)
 * {
 *   "repo": {
 *     "id": 82,
 *     "slug": "sinatra/sinatra",
 *     "description": "Classy web-development dressed in a DSL",
 *     "last_build_id": 23436881,
 *     "last_build_number": "792",
 *     "last_build_state": "passed",
 *     "last_build_duration": 2542,
 *     "last_build_started_at": "2014-04-21T15:27:14Z",
 *     "last_build_finished_at": "2014-04-21T15:40:04Z",
 *     "active": "true"
 *   }
 * }
 */
export function fetchRepository(travisAccessToken, username, repositoryName) {
  const repoSlug = `${username}/${repositoryName}`;
  winston.debug('fetchRepository', repoSlug);

  return new Promise((resolve, reject) => {
    superagent
      .get(`${travisApiUrl}/repos/${repoSlug}`)
      .set({
        'User-Agent': tyrAgent,
        Accept: travisApiAccept,
        Authorization: `token ${travisAccessToken}`
      })
      .end((err, res) => {
        if (err) {
          reject(err);
        } else if (!res.body.repo) {
          reject(new Error(`Unable to find the repository '${repoSlug}'!`));
        } else {
          resolve(res.body.repo);
        }
      });
  });
}
