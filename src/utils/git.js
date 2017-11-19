import inquirer from 'inquirer';

import {
  requestGitHubToken,
  createGitHubRepository,
  initAddCommitAndPush
} from './../clients/github';
import {
  loadTemplate,
  writeFile
} from './file';
import constants from '../constants/constants';
import { getActiveLogger } from '../utils/winston';

const log = getActiveLogger();

/**
 * Create the .gitignore in the newly formed project folder with the basics for a node.js project.
 *
 * @param projectName
 */
export function createGitIgnore(projectName) {
  log.verbose('creating .gitignore file', { projectName });

  writeFile(
    `${projectName}/${constants.github.gitIgnore.fileName}`,
    loadTemplate('./../../templates/git/.gitignore')
  );
}

/**
 * Prompts the user for their two factor authentication code
 */
function prompt2fa() {
  const questions = [{
    name: 'code',
    value: 'input',
    message: 'Two Factor Authentication Code:',
    validate: (value) => {
      if (typeof value === 'undefined' || value === '' || value.indexOf(' ') !== -1 ||
        value.length !== 6) {
        return 'Invalid 2fa code!';
      }

      return true;
    }
  }];

  return inquirer.prompt(questions);
}

/**
 * Signs a user into github and credentials for a user
 *
 * @returns Sample Return object:
 *  {
 *    username: 'username',
 *    password: 'password',
 *    token: 'token',
 *    url: 'www.github.com/hello/world'
 *  } or returns false if the user's request could not be authenticated
 */
export async function signIntoGithub(username, password) {
  const credentials = {};
  try {
    // request a token using only username and password
    const token = await requestGitHubToken(username, password, null);

    // if the above call was successful, set the important information and return their credentials
    credentials.username = username;
    credentials.password = password;
    credentials.token = token.token;
    credentials.url = token.url;
    credentials.isTwoFactorAuth = false;
    log.info('Successfully logged into GitHub!');
    return credentials;
  } catch (err) {
    // if the above call was not successful, we will end up here...

    // if the user's github account has 2fa enabled, the above call will
    // fail with a status of 401 and have the 'x-github-otp' code of
    // `required; sms` or `required; application`.
    // We should prompt for a 2fa code if this the case
    if (err.status === 401 && typeof err.response.headers['x-github-otp'] !== 'undefined'
      && err.response.headers['x-github-otp'].includes('required;')) {
      const code = await prompt2fa();

      try {
        const token = await requestGitHubToken(username, password, code.code);
        credentials.username = username;
        credentials.password = password;
        credentials.token = token.token;
        credentials.url = token.url;
        credentials.isTwoFactorAuth = true;
        log.info('Successfully logged into GitHub!');
        return credentials;
      } catch (error) {
        log.error('failed to sign into github', error);
      }
    } else if (err.status === 401) {
      // the user's request could not be authenticated, so return false.
      return false;
    } else if (err.status === 422) {
      log.error('A github token has already been created.  Please go to https://github.com/settings/tokens and delete hammer-io token.');
    } else {
      // something bad has happened if we get here.
      log.error('failed to sign in to github', err);
    }
  }

  return credentials;
}

/**
 * Setups up a GitHub repo, by requesting a GitHub token
 *
 * @param projectName
 * @param projectDescription
 * @param credentials
 */
export async function createGithubRepo(projectName, projectDescription, credentials) {
  log.verbose('creating repo on Github', credentials);
  try {
    await createGitHubRepository(projectName, projectDescription, credentials.token);
    return true;
  } catch (err) {
    log.error('failed to create github repo', err);
    return false;
  }
}

/**
 * Initialize local and remote repositories
 *
 * @param projectName
 * @param credentials
 */
export async function commitAndPush(projectName, credentials) {
  log.verbose('creating repo on Github', credentials.username);
  try {
    await initAddCommitAndPush(credentials.username, projectName, credentials.isTwoFactorAuth);
    log.info('Successfully setup GitHub');
  } catch (err) {
    log.error('failed to set up local git and push files', err);
  }
}