const Generator = require('yeoman-generator');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const controllerTemplate = require('./templates/controller.template.js');
const generateRealControllersFromServices = require('./generateRealControllersFromServices');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);
    this.option('application', { type: String });
    this.option('service', { type: String });
    this.option('version', {
      type: String,
      description: 'Versión del artefacto/proyecto',
      default: '1.0.0'
    });
    this.option('openapi', {
      type: String,
      description: 'Ruta o URL del archivo OpenAPI',
      default: ''
    });
  }

  async prompting() {
    this.answers = {
      application: this.options.application || 'demo',
      service: this.options.service || 'default',
      version: this.options.version || '1.0.0',
    };
  }

  async writing() {
    // Limpieza final: eliminar __service__.ts residual en user/model y carpeta user si queda vacía
    this.fs.commit(() => {
      // Eliminar cualquier archivo __service__.ts en src/modules/user
      const userServicePath = path.join(destRoot, 'src/modules/user/__service__.ts');
      if (fs.existsSync(userServicePath)) {
        fs.unlinkSync(userServicePath);
      }
      // Eliminar cualquier archivo __service__.ts en src/modules/user/model
      const userModelServicePath = path.join(destRoot, 'src/modules/user/model/__service__.ts');
      if (fs.existsSync(userModelServicePath)) {
        fs.unlinkSync(userModelServicePath);
      }
      // Eliminar carpeta user/model si queda vacía
      const userModelDir = path.join(destRoot, 'src/modules/user/model');
      if (fs.existsSync(userModelDir) && fs.readdirSync(userModelDir).length === 0) {
        fs.rmdirSync(userModelDir);
      }
      // Eliminar carpeta user si queda vacía
      const userDir = path.join(destRoot, 'src/modules/user');
      if (fs.existsSync(userDir) && fs.readdirSync(userDir).length === 0) {
        fs.rmdirSync(userDir);
      }
    });
    const { application, service, version } = this.answers;
    const serviceClass = service.charAt(0).toUpperCase() + service.slice(1);
    const destRoot = `${application}-${service}`;
    const { openapi } = this.options;

    // Eliminar carpeta global de interfaces si existe (solo debe haber interfaces en los módulos)
    const globalInterfacesPath = path.join(destRoot, 'src/interfaces');
    if (fs.existsSync(globalInterfacesPath)) {
      fs.rmSync(globalInterfacesPath, { recursive: true, force: true });
    }


    // Copiar template base
    this.fs.copyTpl(
      this.templatePath(),
      this.destinationPath(destRoot),
      { application, service, serviceClass, version, openapi }
    );

    [
      '.env',
      '.gitignore',
      '.prettierrc',
      '.editorconfig',
      '.eslintrc.json',
      'README.md',
      'jest.config.js',
    ].forEach(file => {
      this.fs.copy(
        this.templatePath(file),
        this.destinationPath(path.join(destRoot, file))
      );
    });

    // Crear carpetas controllers y services dentro del módulo
    const moduleControllersPath = path.join(destRoot, `src/modules/${service}/controllers`);
    const moduleServicesPath = path.join(destRoot, `src/modules/${service}/services`);
    fs.mkdirSync(moduleControllersPath, { recursive: true });
    fs.mkdirSync(moduleServicesPath, { recursive: true });

    this.fs.commit(() => {
      // Definir controllers base a mover (sin incluir __service__.controller.ts si hay OpenAPI)
      const controllersToMove = [
        { src: `src/controllers/oauth.controller.ts`, dest: 'oauth.controller.ts' },
        { src: `src/controllers/redis.controller.ts`, dest: 'redis.controller.ts' },
        { src: `src/controllers/user.controller.ts`, dest: 'userDb.controller.ts' },
        { src: `src/controllers/http-client.controller.ts`, dest: 'http-client.controller.ts' }
      ];

      // Solo agregar el controller base del servicio si NO hay OpenAPI
      if (!openapi) {
        controllersToMove.push({
          src: `src/controllers/__service__.controller.ts`,
          dest: `${service}.controller.ts`
        });
      }

      controllersToMove.forEach(controller => {
        const srcPath = path.join(destRoot, controller.src);
        const destPath = path.join(moduleControllersPath, controller.dest);

        if (fs.existsSync(srcPath)) {
          if (fs.existsSync(destPath)) {
            fs.unlinkSync(srcPath);
            return;
          }
          fs.mkdirSync(path.dirname(destPath), { recursive: true });
          fs.renameSync(srcPath, destPath);
        }
      });

      // Limpiar archivos no utilizados cuando hay OpenAPI
      if (openapi) {
        const unusedServiceController = path.join(destRoot, `src/controllers/__service__.controller.ts`);
        if (fs.existsSync(unusedServiceController)) {
          fs.unlinkSync(unusedServiceController);
        }
      }

      // Eliminar carpeta global de controllers si está vacía
      const globalControllersPath = path.join(destRoot, 'src/controllers');
      if (fs.existsSync(globalControllersPath)) {
        const remainingFiles = fs.readdirSync(globalControllersPath);
        if (remainingFiles.length === 0) {
          fs.rmSync(globalControllersPath, { recursive: true, force: true });
        }
      }
    });

    // Generar el archivo del módulo directamente con el nombre correcto
    this.fs.copyTpl(
      this.templatePath('src/modules/user/__service__.module.ts.ejs'),
      this.destinationPath(`${destRoot}/src/modules/${service}/${service}.module.ts`),
      { serviceClass, service }
    );

    // Generar el serviceDb y entity como antes
    this.fs.copyTpl(
      this.templatePath('src/modules/user/__service__.ts.ejs'),
      this.destinationPath(`${destRoot}/src/modules/${service}/model/${service}Db.ts`),
      { serviceClass }
    );

    this.fs.move(
      this.destinationPath(`${destRoot}/src/modules/user/__service__.service.ts`),
      this.destinationPath(`${destRoot}/src/modules/${service}/services/${service}Db.service.ts`)
    );
    this.fs.move(
      this.destinationPath(`${destRoot}/src/database/entities/user.entity.ts`),
      this.destinationPath(`${destRoot}/src/database/entities/${service}.entity.ts`)
    );

    // Eliminar cualquier archivo __service__.module.ts que accidentalmente quede en el proyecto generado
    const accidentalModule = path.join(destRoot, 'src/modules/user/__service__.module.ts');
    this.fs.delete(this.destinationPath(accidentalModule));

    // ==========================
    // OpenAPI Generator CLI
    // ==========================
    if (openapi) {
      try {
        const generator = 'typescript-nestjs';
        const outputDir = this.destinationPath(`${destRoot}/__openapi-temp__`);
        const modulePath = this.destinationPath(`${destRoot}/src/modules/${service}`);

        this.log(`🚀 Running OpenAPI Generator CLI with npx...`);

        execSync(
          `npx @openapitools/openapi-generator-cli generate -i "${openapi}" -g ${generator} -o "${outputDir}" --additional-properties=controllerStrategy=tags`,
          { stdio: 'inherit' }
        );

        // Copiar TODO tal como viene de OpenAPI Generator usando fs directo
        const fse = require('fs-extra');

        fse.copySync(
          path.join(outputDir, 'model'),
          path.join(modulePath, 'model')
        );

        fse.copySync(
          path.join(outputDir, 'api'),
          path.join(modulePath, 'services')
        );

        // Copiar archivos de configuración y variables al nivel del módulo
        const configFiles = ['configuration.ts', 'variables.ts'];
        configFiles.forEach(file => {
          const srcFile = path.join(outputDir, file);
          const destFile = path.join(modulePath, file);
          if (fs.existsSync(srcFile)) {
            fs.copyFileSync(srcFile, destFile);
          }
        });

        // Eliminar api.ts innecesario de services/
        const apiFile = path.join(modulePath, 'services', 'api.ts');
        if (fs.existsSync(apiFile)) {
          fs.unlinkSync(apiFile);
        }

        // Eliminar carpeta temporal
        fs.rmSync(outputDir, { recursive: true, force: true });

        // Crear controllers básicos después de que los archivos estén copiados
        this.createControllers(modulePath, service);

        this.log(`✅ Project generated with OpenAPI successfully`);
        this.log(`🎯 HTTP services are ready to use`);
        this.log(`📦 OpenAPI dependencies will be installed automatically with postinstall`);
      } catch (err) {
        this.log('❌ Error running OpenAPI Generator:', err.message);
      }
    }

    const userModelServicePath = path.join(destRoot, 'src/modules/user/model/__service__.ts');
    if (fs.existsSync(userModelServicePath)) {
      fs.unlinkSync(userModelServicePath);
    }
    const userModelServiceEjsPath = path.join(destRoot, 'src/modules/user/model/__service__.ts.ejs');
    if (fs.existsSync(userModelServiceEjsPath)) {
      fs.unlinkSync(userModelServiceEjsPath);
    }
    const userModelDir = path.join(destRoot, 'src/modules/user/model');
    if (fs.existsSync(userModelDir) && fs.readdirSync(userModelDir).length === 0) {
      fs.rmdirSync(userModelDir);
    }
    const userDir = path.join(destRoot, 'src/modules/user');
    if (fs.existsSync(userDir) && fs.readdirSync(userDir).length === 0) {
      fs.rmdirSync(userDir);
    }

    this.log(`✨ Project generated in '${destRoot}' with modular structure and OpenAPI support.`);
  }

  createControllers(modulePath, serviceName) {
    if (!modulePath) return;
    if (!fs.existsSync(modulePath)) return;
    const servicesPath = path.join(modulePath, 'services');
    if (!fs.existsSync(servicesPath)) return;
    const controllersPath = path.join(modulePath, 'controllers');
    if (!fs.existsSync(controllersPath)) {
      fs.mkdirSync(controllersPath, { recursive: true });
    }
    const serviceFiles = fs.readdirSync(servicesPath).filter(f =>
      f.endsWith('.ts') &&
      !f.includes('configuration') &&
      !f.includes('variables') &&
      !f.includes('index') &&
      !f.includes('api.') &&
      f.includes('.service')
    );
    if (serviceFiles.length === 0) return;
    generateRealControllersFromServices(servicesPath, controllersPath, serviceFiles, this.log.bind(this));
  }

};
