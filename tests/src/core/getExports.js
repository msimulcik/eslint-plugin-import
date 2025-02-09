import { expect } from  'chai'
import ExportMap from 'core/getExports'

import * as fs from 'fs'

import { getFilename } from '../utils'

describe('getExports', function () {
  const fakeContext = {
    getFilename: getFilename,
    settings: {},
    parserPath: 'babel-eslint',
  }

  it('should handle ExportAllDeclaration', function () {
    var imports
    expect(function () {
      imports = ExportMap.get('./export-all', fakeContext)
    }).not.to.throw(Error)

    expect(imports).to.exist
    expect(imports.has('foo')).to.be.true

  })

  it('should return a cached copy on subsequent requests', function () {
    expect(ExportMap.get('./named-exports', fakeContext))
      .to.exist.and.equal(ExportMap.get('./named-exports', fakeContext))
  })

  it('should not return a cached copy after modification', (done) => {
    const firstAccess = ExportMap.get('./mutator', fakeContext)
    expect(firstAccess).to.exist

    // mutate (update modified time)
    const newDate = new Date()
    fs.utimes(getFilename('mutator.js'), newDate, newDate, (error) => {
      expect(error).not.to.exist
      expect(ExportMap.get('./mutator', fakeContext)).not.to.equal(firstAccess)
      done()
    })
  })

  it('should not return a cached copy with different settings', () => {
    const firstAccess = ExportMap.get('./named-exports', fakeContext)
    expect(firstAccess).to.exist

    const differentSettings = Object.assign(
      {},
      fakeContext,
      { parserPath: 'espree' })

    expect(ExportMap.get('./named-exports', differentSettings))
      .to.exist.and
      .not.to.equal(firstAccess)
  })

  it('should not throw for a missing file', function () {
    var imports
    expect(function () {
      imports = ExportMap.get('./does-not-exist', fakeContext)
    }).not.to.throw(Error)

    expect(imports).not.to.exist

  })

  it('should export explicit names for a missing file in exports', function () {
    var imports
    expect(function () {
      imports = ExportMap.get('./exports-missing', fakeContext)
    }).not.to.throw(Error)

    expect(imports).to.exist
    expect(imports.has('bar')).to.be.true

  })

  it('finds exports for an ES7 module with babel-eslint', function () {
    var imports = ExportMap.parse(
      getFilename('jsx/FooES7.js'),
      { parserPath: 'babel-eslint' }
    )

    expect(imports).to.exist
    expect(imports.get('default')).to.exist
    expect(imports.has('Bar')).to.be.true
  })

  context('deprecation metadata', function () {

    function jsdocTests(parseContext) {
      context('deprecated imports', function () {
        let imports
        before('parse file', function () {
          imports = ExportMap.parse(
            getFilename('deprecated.js'), parseContext)

          // sanity checks
          expect(imports.errors).to.be.empty
        })

        it('works with named imports.', function () {
          expect(imports.has('fn')).to.be.true

          expect(imports.get('fn'))
            .to.have.deep.property('doc.tags[0].title', 'deprecated')
          expect(imports.get('fn'))
            .to.have.deep.property('doc.tags[0].description', "please use 'x' instead.")
        })

        it('works with default imports.', function () {
          expect(imports.has('default')).to.be.true
          const importMeta = imports.get('default')

          expect(importMeta).to.have.deep.property('doc.tags[0].title', 'deprecated')
          expect(importMeta).to.have.deep.property('doc.tags[0].description', 'this is awful, use NotAsBadClass.')
        })

        it('works with variables.', function () {
          expect(imports.has('MY_TERRIBLE_ACTION')).to.be.true
          const importMeta = imports.get('MY_TERRIBLE_ACTION')

          expect(importMeta).to.have.deep.property(
            'doc.tags[0].title', 'deprecated')
          expect(importMeta).to.have.deep.property(
            'doc.tags[0].description', 'please stop sending/handling this action type.')
        })

        context('multi-line variables', function () {
          it('works for the first one', function () {
            expect(imports.has('CHAIN_A')).to.be.true
            const importMeta = imports.get('CHAIN_A')

            expect(importMeta).to.have.deep.property(
              'doc.tags[0].title', 'deprecated')
            expect(importMeta).to.have.deep.property(
              'doc.tags[0].description', 'this chain is awful')
          })
          it('works for the second one', function () {
            expect(imports.has('CHAIN_B')).to.be.true
            const importMeta = imports.get('CHAIN_B')

            expect(importMeta).to.have.deep.property(
              'doc.tags[0].title', 'deprecated')
            expect(importMeta).to.have.deep.property(
              'doc.tags[0].description', 'so awful')
          })
          it('works for the third one, etc.', function () {
            expect(imports.has('CHAIN_C')).to.be.true
            const importMeta = imports.get('CHAIN_C')

            expect(importMeta).to.have.deep.property(
              'doc.tags[0].title', 'deprecated')
            expect(importMeta).to.have.deep.property(
              'doc.tags[0].description', 'still terrible')
          })
        })
      })

      context('full module', function () {
        let imports
        before('parse file', function () {
          imports = ExportMap.parse(
            getFilename('deprecated-file.js'), parseContext)

          // sanity checks
          expect(imports.errors).to.be.empty
        })

        it('has JSDoc metadata', function () {
          expect(imports.doc).to.exist
        })
      })
    }

    context('default parser', function () {
      jsdocTests({
        parserPath: 'espree',
        parserOptions: {
          sourceType: 'module',
          attachComment: true,
        },
      })
    })

    context('babel-eslint', function () {
      jsdocTests({
        parserPath: 'babel-eslint',
        parserOptions: {
          sourceType: 'module',
          attachComment: true,
        },
      })
    })
  })

  context('exported static namespaces', function () {
    const espreeContext = { parserPath: 'espree', parserOptions: { sourceType: 'module' }, settings: {} }
    const babelContext = { parserPath: 'babel-eslint', parserOptions: { sourceType: 'module' }, settings: {} }

    it('works with espree & traditional namespace exports', function () {
      const a = ExportMap.parse(getFilename('deep/a.js'), espreeContext)
      expect(a.errors).to.be.empty
      expect(a.get('b').namespace).to.exist
      expect(a.get('b').namespace.has('c')).to.be.true
    })

    it('captures namespace exported as default', function () {
      const def = ExportMap.parse(getFilename('deep/default.js'), espreeContext)
      expect(def.errors).to.be.empty
      expect(def.get('default').namespace).to.exist
      expect(def.get('default').namespace.has('c')).to.be.true
    })

    it('works with babel-eslint & ES7 namespace exports', function () {
      const a = ExportMap.parse(getFilename('deep-es7/a.js'), babelContext)
      expect(a.errors).to.be.empty
      expect(a.get('b').namespace).to.exist
      expect(a.get('b').namespace.has('c')).to.be.true
    })
  })

  context('deep namespace caching', function () {
    const espreeContext = { parserPath: 'espree', parserOptions: { sourceType: 'module' }, settings: {} }
    let a
    before('sanity check and prime cache', function (done) {
      // first version
      fs.writeFileSync(getFilename('deep/cache-2.js'),
        fs.readFileSync(getFilename('deep/cache-2a.js')))

      a = ExportMap.parse(getFilename('deep/cache-1.js'), espreeContext)
      expect(a.errors).to.be.empty

      expect(a.get('b').namespace).to.exist
      expect(a.get('b').namespace.has('c')).to.be.true

      // wait ~1s, cache check is 1s resolution
      setTimeout(function reup() {
        fs.unlinkSync(getFilename('deep/cache-2.js'))
        // swap in a new file and touch it
        fs.writeFileSync(getFilename('deep/cache-2.js'),
          fs.readFileSync(getFilename('deep/cache-2b.js')))
        done()
      }, 1100)
    })

    it('works', function () {
      expect(a.get('b').namespace.has('c')).to.be.false
    })

    after('remove test file', (done) => fs.unlink(getFilename('deep/cache-2.js'), done))
  })

  context('Map API', function () {
    context('#size', function () {

      it('counts the names', () => expect(ExportMap.get('./named-exports', fakeContext))
        .to.have.property('size', 8))

      it('includes exported namespace size', () => expect(ExportMap.get('./export-all', fakeContext))
        .to.have.property('size', 1))

    })
  })

  context('issue #210: self-reference', function () {
    it("doesn't crash", function () {
      expect(() => ExportMap.get('./narcissist', fakeContext)).not.to.throw(Error)
    })
    it("'has' circular reference", function () {
      expect(ExportMap.get('./narcissist', fakeContext))
        .to.exist.and.satisfy(m => m.has('soGreat'))
    })
    it("can 'get' circular reference", function () {
      expect(ExportMap.get('./narcissist', fakeContext))
        .to.exist.and.satisfy(m => m.get('soGreat') != null)
    })
  })

})
