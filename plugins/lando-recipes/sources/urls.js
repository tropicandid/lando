'use strict';

// Modules
const _ = require('lodash');
const url = require('valid-url');

module.exports = {
  sources: [{
    label: 'remote git repo or archive',
    name: 'remote',
    options: {
      'remote-url': {
        describe: 'The URL of your git repo or archive, only works when you set source to remote',
        alias: ['url'],
        string: true,
        interactive: {
          type: 'input',
          message: 'Please enter the URL of the git repo or tar archive containing your application code',
          when: answers => answers.source === 'remote',
          validate: input => {
            const uri = (_.includes(input, '@')) ? input.split('@')[1] : input;
            if (url.isUri(uri)) return true;
            else return `${input} does not seem to be a valid uri!`;
          },
          weight: 110,
        },
      },
    },
    build: options => ([
      {cmd: `/helpers/get-remote-url.sh ${options.remoteUrl}`},
    ]),
  }],
};