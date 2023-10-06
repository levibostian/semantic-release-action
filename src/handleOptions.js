const core = require('@actions/core');
const stringToJson = require('@cycjimmy/awesome-js-funcs/cjs/typeConversion/stringToJson.cjs').default;
const inputs = require('./inputs.json');

/**
 * Handle Branches Option
 * @returns {{}|{branch: string}}
 */
exports.handleBranchesOption = () => {
  const branchesOption = {};
  const branches = core.getInput(inputs.branches);
  const branch = core.getInput(inputs.branch);

  core.debug(`branches input: ${branches}`);
  core.debug(`branch input: ${branch}`);

  const semanticVersion = require('semantic-release/package.json').version;
  const semanticMajorVersion = Number(semanticVersion.replace(/\..+/g, ''));
  core.debug(`semanticMajorVersion: ${semanticMajorVersion}`);

  // older than v16
  if (semanticMajorVersion < 16) {
    if (!branch) {
      return branchesOption;
    }

    branchesOption.branch = branch;
    return branchesOption;
  }

  // above v16
  const strNeedConvertToJson = branches || branch || '';

  if (!strNeedConvertToJson) {
    return branchesOption;
  }

  const jsonOrStr = stringToJson('' + strNeedConvertToJson);
  core.debug(`Converted branches attribute: ${JSON.stringify(jsonOrStr)}`);
  branchesOption.branches = jsonOrStr;
  return branchesOption;
};

/**
 * Handle DryRun Option
 * @returns {{}|{dryRun: boolean}}
 */
exports.handleDryRunOption = () => {
  const dryRun = core.getInput(inputs.dry_run);
  core.debug(`dryRun input: ${dryRun}`);

  switch (dryRun) {
    case 'true':
      return {dryRun: true};

    case 'false':
      return {dryRun: false};

    default:
      return {};
  }
};

/**
 * Handle Ci Option
 * @returns {{}|{ci: boolean}}
 */
exports.handleCiOption = () => {
  const ci = core.getInput(inputs.ci);
  core.debug(`ci input: ${ci}`);

  switch (ci) {
    case 'true':
      return { ci: true, noCi: false };

    case 'false':
      return { ci: false, noCi: true };

    default:
      return {};
  }
};

/**
 * Handle Extends Option
 * @returns {{}|{extends: Array}|{extends: String}}
 */
exports.handleExtends = () => {
  const extend = core.getInput(inputs.extends);
  core.debug(`extend input: ${extend}`);

  if (extend) {
    const extendModuleNames = extend.split(/\r?\n/)
      .map((name) => name.replace(/(?<!^)@.+/, ''))
    return {
      extends: extendModuleNames
    };
  } else {
    return {};
  }
};

/**
 * Handle TagFormat Option
 * @returns {{}|{tagFormat: String}}
 */
exports.handleTagFormat = () => {
  const tagFormat = core.getInput(inputs.tag_format);
  core.debug(`citagFormat input: ${tagFormat}`);

  if (tagFormat) {
    return {
      tagFormat
    };
  } else {
    return {};
  }
};

exports.handleSimulationRun = async() => {
  const dryRunOptions = this.handleDryRunOption();
  const isInDryRunMode = dryRunOptions != {} && dryRunOptions.dryRun == true;
  if (!isInDryRunMode) {
    core.debug(`Not in dry-run mode, skipping simulation run`);
    return;
  }

  const simulationBranchName = core.getInput(inputs.simulate_push_branch);
  core.debug(`simulate_push_branch input: ${simulationBranchName}`);

  if (simulationBranchName === '') return;

  // Trick semantic-release into thinking that it's running after a push event, like you would do for a real deployment. 
  // This is required because by default, semantic-release will not run on a pull-request event, even in dry-run mode. 
  process.env.GITHUB_EVENT_NAME = "push"

  // Trick semantic-release into thinking that the github action was triggered from pushing to the current branch. 
  // This is required because by default, semantic-release refers to the GITHUB_REF environment variable to determine the branch to try and release from. When, really, we 
  // may have checked out a different branch before running this action.
  process.env.GITHUB_REF = `refs/heads/${simulationBranchName}`
}
