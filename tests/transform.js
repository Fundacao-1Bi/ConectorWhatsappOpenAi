const { transformSync } = require('esbuild');
module.exports = {
  process(source, filename) {
    return { code: transformSync(source, { loader: 'ts', format: 'cjs', target: 'node16', sourcefile: filename }).code };
  },
};
