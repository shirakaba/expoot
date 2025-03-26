import path from 'node:path';

import {
  withEntitlementsPlist,
  withInfoPlist,
} from '@expo/config-plugins/build/plugins/ios-plugins';
import type { resolveConfigPluginFunctionWithInfo as resolveConfigPluginFunctionWithInfoType } from '@expo/config-plugins/build/utils/plugin-resolver';
import type { ExpoConfig as UpstreamExpoConfig } from '@expo/config-types';
import base64js from 'base64-js';
import { globSync } from 'glob';
import { vol } from 'memfs';
import * as xmlbuilder from 'xmlbuilder';
import * as xmlbuilder2 from 'xmlbuilder2';
import type { XMLBuilder, XMLBuilderOptions } from 'xmlbuilder2/lib/interfaces';

import { evalModsAsync } from '../mod-compiler';
import { getIosModFileProviders, withIosBaseMods } from '../withIosBaseMods';

vi.mock('glob');

vi.mock('xmlbuilder');
vi.mock(import('@expo/plist'), async (importActual) => {
  // const actual = await importActual();
  return {
    // ...actual,
    build: (obj: any, opts?: { [key: string]: any }): string => {
      const XMLHDR = {
        version: '1.0',
        encoding: 'UTF-8',
      } as const;

      const XMLDTD = {
        pubid: '-//Apple//DTD PLIST 1.0//EN',
        sysid: 'http://www.apple.com/DTDs/PropertyList-1.0.dtd',
      } as const;

      const doc = xmlbuilder2.create().ele('plist');
      doc.dec({ ...XMLHDR, standalone: false });
      doc.dtd({ pubID: XMLDTD.pubid, sysID: XMLDTD.sysid });
      doc.att('version', '1.0');
      walk_obj(obj, doc);
      if (!opts) opts = {};
      // default `pretty` to `true`
      opts.pretty = opts.pretty !== false;
      return doc.end(opts);
    },
  };
});

function walk_obj(next, next_child: XMLBuilder) {
  let tag_type, i, prop;
  const name = type(next);
  if (name === 'Undefined') {
  } else if (Array.isArray(next)) {
    next_child = next_child.ele('array');
    for (i = 0; i < next.length; i++) {
      walk_obj(next[i], next_child);
    }
  } else if (Buffer.isBuffer(next)) {
    next_child.ele('data').raw(next.toString('base64'));
  } else if (name === 'Object') {
    next_child = next_child.ele('dict');
    for (prop in next) {
      if (next.hasOwnProperty(prop) && next[prop] !== undefined) {
        next_child.ele('key').txt(prop);
        walk_obj(next[prop], next_child);
      }
    }
  } else if (name === 'Number') {
    // detect if this is an integer or real
    // TODO: add an ability to force one way or another via a "cast"
    tag_type = next % 1 === 0 ? 'integer' : 'real';
    next_child.ele(tag_type).txt(next.toString());
  } else if (name === 'Date') {
    next_child.ele('date').txt(ISODateString(new Date(next)));
  } else if (name === 'Boolean') {
    next_child.ele(next ? 'true' : 'false');
  } else if (name === 'String') {
    next_child.ele('string').txt(next);
  } else if (name === 'ArrayBuffer') {
    next_child.ele('data').raw(base64js.fromByteArray(next));
  } else if (next && next.buffer && type(next.buffer) === 'ArrayBuffer') {
    // a typed array
    next_child
      .ele('data')
      .raw(base64js.fromByteArray(new Uint8Array(next.buffer)));
  }
}
function ISODateString(d: Date) {
  function pad(n: number) {
    return n < 10 ? '0' + n : n;
  }
  return (
    d.getUTCFullYear() +
    '-' +
    pad(d.getUTCMonth() + 1) +
    '-' +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    ':' +
    pad(d.getUTCMinutes()) +
    ':' +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}
function type(obj: unknown) {
  const m = toString.call(obj).match(/\[object (.*)\]/);
  return m ? m[1] : m;
}

// eslint-disable-next-line @typescript-eslint/unbound-method
const toString = Object.prototype.toString;

// vi.mock(
//   import('xmlbuilder/lib/XMLDOMImplementation'),
//   async (importOriginal) => {
//     // const original = await importOriginal();
//     console.log('HERE GOES XMLDOMImplementation');
//     class XMLDOMImplementation {}

//     return { foo: 123, default: vi.fn() };
//   }
// );
vi.mock(import('xmlbuilder'), async (_importActual) => {
  return {
    default: xmlbuilder2,
    begin: ((
      options?: xmlbuilder.BeginOptions | xmlbuilder.OnDataCallback,
      onData?: xmlbuilder.OnDataCallback | xmlbuilder.OnEndCallback,
      onEnd?: xmlbuilder.OnEndCallback
    ) => {
      const normalisedOptions = typeof options === 'function' ? {} : options;
      const normalisedOnData = typeof options === 'function' ? options : onData;
      const normalisedOnEnd = typeof options === 'function' ? onData : onEnd;

      const builder = normalisedOnData
        ? xmlbuilder2.createCB({
            ...normalisedOptions,
            data: normalisedOnData,
            end: normalisedOnEnd,
          })
        : xmlbuilder2.create(normalisedOptions as XMLBuilderOptions);

      if (!('node' in builder)) {
        throw new Error('Unable to support createCB');
      }

      // Smoosh together Node and XMLBuilder
      return new Proxy(builder.node, {
        get(_target, prop, _receiver) {
          if (prop in builder) {
            const value = builder[prop as keyof typeof builder];
            return typeof value === 'function' ? value.bind(builder) : value;
          }

          // @ts-expect-error wrong
          // eslint-disable-next-line prefer-rest-params
          return Reflect.get(...arguments);
        },
      }) as unknown as xmlbuilder.XMLDocument;
    }) as (typeof xmlbuilder)['begin'],
    create: (
      name: string | xmlbuilder.CreateOptions,
      xmldec?: xmlbuilder.CreateOptions,
      doctype?: xmlbuilder.CreateOptions,
      options?: xmlbuilder.CreateOptions
    ) => {
      const normalisedOptions: xmlbuilder.CreateOptions = Object.assign(
        {},
        xmldec,
        doctype,
        options
      );

      const builder =
        typeof name === 'string'
          ? xmlbuilder2.create(normalisedOptions).ele(name)
          : xmlbuilder2.create({ ...name, normalisedOptions });

      // Smoosh together Node and XMLBuilder
      return new Proxy(builder.node, {
        get(_target, prop, _receiver) {
          if (prop in builder) {
            const value = builder[prop as keyof typeof builder];
            return typeof value === 'function' ? value.bind(builder) : value;
          }

          // @ts-expect-error wrong
          // eslint-disable-next-line prefer-rest-params
          return Reflect.get(...arguments);
        },
      }) as unknown as xmlbuilder.XMLElement;
    },
    // create √
    // begin
    // stringWriter
    // streamWriter
    // implementation
    // nodeType
    // writerState
    // ...xmlbuilder2,
  } satisfies typeof xmlbuilder;
});

vi.mock(
  import('@expo/config-plugins/build/utils/plugin-resolver'),
  async (_importOriginal) => {
    // Avoid importing the original, because it involves dynamic require()
    // statements, which vite-plugin-commonjs draws the line at.

    return {
      resolveConfigPluginFunctionWithInfo: vi.fn<
        typeof resolveConfigPluginFunctionWithInfoType
      >((_projectRoot: string, _pluginReference: string) => {
        return {
          plugin: (config: UpstreamExpoConfig, _props: unknown) => config,
          pluginFile: '',
          pluginReference: '',
          isPluginFile: false,
        };
      }),
    };
  }
);

const actualFs = await vi.importActual<typeof import('fs')>('fs');

describe('entitlements', () => {
  afterEach(() => {
    vol.reset();
  });

  it('evaluates in dry run mode', async () => {
    // Ensure this test runs in a blank file system
    vol.fromJSON({});
    let config: UpstreamExpoConfig = { name: 'bacon', slug: 'bacon' };
    config = withEntitlementsPlist(config, (config) => {
      config.modResults['haha'] = 'bet';
      return config;
    });

    // base mods must be added last
    config = withIosBaseMods(config, {
      saveToInternal: true,
      providers: {
        entitlements: {
          getFilePath() {
            return '';
          },
          async read() {
            return {};
          },
          async write() {},
        },
      },
    }) as UpstreamExpoConfig;
    config = (await evalModsAsync(config, {
      projectRoot: '/',
      platforms: ['ios'],
    })) as UpstreamExpoConfig;

    expect(config.ios?.entitlements).toStrictEqual({
      haha: 'bet',
    });
    // @ts-ignore: mods are untyped
    expect(config.mods.ios.entitlements).toBeDefined();

    expect(config._internal?.modResults.ios.entitlements).toBeDefined();

    // Ensure no files were written
    expect(vol.toJSON()).toStrictEqual({});
  });

  it('uses local entitlement files by default', async () => {
    // Create a fake project that can load entitlements
    vol.fromJSON({
      '/ios/HelloWorld/AppDelegate.mm': 'Fake AppDelegate.mm',
      '/ios/HelloWorld.xcodeproj/project.pbxproj': actualFs.readFileSync(
        path.resolve(__dirname, './fixtures/project-files/ios/project.pbxproj'),
        'utf-8'
      ),
      '/ios/HelloWorld/HelloWorld.entitlements': actualFs.readFileSync(
        path.resolve(
          __dirname,
          './fixtures/project-files/ios/project.entitlements'
        ),
        'utf-8'
      ),
    });

    // Mock glob response to "find" the memfs files
    vi.mocked(globSync).mockImplementation((pattern) => {
      if (pattern === 'ios/**/*.xcodeproj')
        return ['/ios/HelloWorld.xcodeproj'];
      if (pattern === 'ios/*/AppDelegate.@(m|mm|swift)')
        return ['/ios/HelloWorld/AppDelegate.mm'];
      throw new Error('Unexpected glob pattern used in test');
    });

    // Create simple project config and config plugin chain
    let config: UpstreamExpoConfig = { name: 'bacon', slug: 'bacon' };
    config = withEntitlementsPlist(config, (config) => {
      config.modResults['haha'] = 'yes';
      return config;
    });

    // Base mod must be added last
    config = withIosBaseMods(config, {
      saveToInternal: true,
      providers: {
        // Use the default mod provider, that's the one we need to test
        entitlements: getIosModFileProviders().entitlements,
      },
    }) as UpstreamExpoConfig;
    config = (await evalModsAsync(config, {
      projectRoot: '/',
      platforms: ['ios'],
    })) as UpstreamExpoConfig;

    // Check if the generated entitlements are merged with local entitlements
    expect(config.ios?.entitlements).toMatchInlineSnapshot(`
      {
        "aps-environment": "development",
        "com.apple.developer.applesignin": [
          "Default",
        ],
        "com.apple.developer.associated-domains": [
          "applinks:acme.com",
        ],
        "com.apple.developer.icloud-container-identifiers": [
          "iCloud.$(CFBundleIdentifier)",
        ],
        "com.apple.developer.icloud-services": [
          "CloudDocuments",
        ],
        "com.apple.developer.ubiquity-container-identifiers": [
          "iCloud.$(CFBundleIdentifier)",
        ],
        "com.apple.developer.ubiquity-kvstore-identifier": "$(TeamIdentifierPrefix)$(CFBundleIdentifier)",
        "haha": "yes",
      }
    `);
  });

  it('skips local entitlements files when ignoring existing native files', async () => {
    // Create a fake project that can load entitlements
    vol.fromJSON({
      '/ios/HelloWorld/AppDelegate.mm': 'Fake AppDelegate.mm',
      '/ios/HelloWorld.xcodeproj/project.pbxproj': actualFs.readFileSync(
        path.resolve(__dirname, './fixtures/project-files/ios/project.pbxproj'),
        'utf-8'
      ),
      '/ios/HelloWorld/HelloWorld.entitlements': actualFs.readFileSync(
        path.resolve(
          __dirname,
          './fixtures/project-files/ios/project.entitlements'
        ),
        'utf-8'
      ),
    });

    // Mock glob response to "find" the memfs files
    vi.mocked(globSync).mockImplementation((pattern) => {
      if (pattern === 'ios/**/*.xcodeproj')
        return ['/ios/HelloWorld.xcodeproj'];
      if (pattern === 'ios/*/AppDelegate.@(m|mm|swift)')
        return ['/ios/HelloWorld/AppDelegate.mm'];
      throw new Error('Unexpected glob pattern used in test');
    });

    // Create simple project config and config plugin chain
    let config: UpstreamExpoConfig = { name: 'bacon', slug: 'bacon' };
    config = withEntitlementsPlist(config, (config) => {
      config.modResults['haha'] = 'yes';
      return config;
    });

    // Base mod must be added last
    config = withIosBaseMods(config, {
      saveToInternal: true,
      providers: {
        // Use the default mod provider, that's the one we need to test
        entitlements: getIosModFileProviders().entitlements,
      },
    }) as UpstreamExpoConfig;
    config = (await evalModsAsync(config, {
      projectRoot: '/',
      platforms: ['ios'],
      ignoreExistingNativeFiles: true,
    })) as UpstreamExpoConfig;

    // Check if the generated entitlements are NOT merged with local entitlements
    expect(config.ios?.entitlements).toMatchInlineSnapshot(`
      {
        "haha": "yes",
      }
    `);
  });
});

describe('infoPlist', () => {
  afterEach(() => {
    vol.reset();
  });

  it('evaluates in dry run mode', async () => {
    // Ensure this test runs in a blank file system
    vol.fromJSON({});
    let config: UpstreamExpoConfig = { name: 'bacon', slug: 'bacon' };
    config = withInfoPlist(config, (config) => {
      config.modResults['haha'] = 'bet';
      return config;
    });

    // base mods must be added last
    config = withIosBaseMods(config, {
      saveToInternal: true,
      providers: {
        infoPlist: {
          getFilePath() {
            return '';
          },
          async read() {
            return {};
          },
          async write() {},
        },
      },
    }) as UpstreamExpoConfig;
    config = (await evalModsAsync(config, {
      projectRoot: '/',
      platforms: ['ios'],
    })) as UpstreamExpoConfig;

    expect(config.ios?.infoPlist).toStrictEqual({
      haha: 'bet',
    });
    // @ts-ignore: mods are untyped
    expect(config.mods.ios.infoPlist).toBeDefined();

    expect(config._internal?.modResults.ios.infoPlist).toBeDefined();

    // Ensure no files were written
    expect(vol.toJSON()).toStrictEqual({});
  });
});
