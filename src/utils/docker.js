import winston from 'winston';

import constants from '../constants/constants';
import * as file from './file';

import * as dockerClient from '../clients/docker';

/**
 * Wrapper for the sign in to docker command
 * @param credentials the docker credentials
 *
 * {
 *  email: 'someemail@email.com',
 *  password: 'somethingsomething"
 * }
 *
 * @returns true if the login was successful, false if it was not
 */
export async function signInToDocker(credentials) {
  try {
    await dockerClient.login(credentials);
    return true;
  } catch (err) {
    if (err.status === 401) {
      return false;
    }

    winston.log('error', 'failed to sign in to Docker', err);
  }
}

/**
 * Generate the required Docker files
 *
 * @param config
 */
export function initDocker(config) {
  winston.log('verbose', 'initializing docker files');

  file.writeFile(
    `${config.projectName}/${constants.docker.dockerFile.fileName}`,
    file.loadTemplate('./../../templates/docker/Dockerfile')
  );

  file.writeFile(
    `${config.projectName}/${constants.docker.dockerIgnore.fileName}`,
    file.loadTemplate('./../../templates/docker/.dockerignore')
  );
}
