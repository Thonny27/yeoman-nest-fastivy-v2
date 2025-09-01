const path = require('path');
const assert = require('assert');
const helpers = require('yeoman-test');
const fs = require('fs');

jest.setTimeout(60000); // Aumenta el timeout global a 60 segundos

describe('Yeoman Generator: ads-microservice-template-nodejs', () => {
  let tmpDir;
  const appName = 'testapp';
  const serviceName = 'pet';
  const outputDir = `${appName}-${serviceName}`;

  beforeAll(async () => {
    await helpers
      .run(path.join(__dirname, '../generators/app'))
      .inTmpDir(dir => { tmpDir = dir; })
      .withOptions({ application: appName, service: serviceName, version: '1.0.0' });
  });


  it('debe crear la carpeta del microservicio', () => {
    const exists = fs.existsSync(path.join(tmpDir, outputDir));
    assert.ok(exists);
  });

  it('debe copiar el archivo .env', () => {
    const envPath = path.join(tmpDir, outputDir, '.env');
    assert.ok(fs.existsSync(envPath));
  });

  it('debe copiar el archivo package.json', () => {
    const pkgPath = path.join(tmpDir, outputDir, 'package.json');
    assert.ok(fs.existsSync(pkgPath));
  });

  it('debe copiar el archivo jest.config.js', () => {
    const jestPath = path.join(tmpDir, outputDir, 'jest.config.js');
    assert.ok(fs.existsSync(jestPath));
  });
});
