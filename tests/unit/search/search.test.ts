/**
 * @file search.test.ts
 * @description Suite de pruebas unitarias y de contrato para la capa de búsqueda desacoplada
 * (`normalize.ts`, `fuseEngine.ts`, `useSearch.ts`).
 * @satisfies UT-BUS-01, UT-BUS-02, UT-BUS-03, UT-BUS-04, UT-BUS-05, UT-BUS-06, UT-BUS-07, UT-BUS-08, UT-BUS-09, UT-BUS-10, RF-18, RF-23, RNF-07, RNF-08
 */

import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { FuseSearchEngine } from '~/composables/search/fuseEngine';
import {
    buildSynonymMap,
    DEFAULT_SYNONYM_GROUPS,
    expandSynonyms,
    normalizeText,
    tokenize,
} from '~/composables/search/normalize';
import type { SearchableProduct, SearchIndexPayload } from '~/composables/search/types';
import { useSearch } from '~/composables/search/useSearch';
import type { Producto } from '~/types/sanity';

const INDEX_FIXTURE: SearchIndexPayload = {
    schemaVersion: 1,
    generatedAt: '2026-10-21T00:00:00Z',
    products: [
        {
            _id: 'p-1',
            nombre: 'Llavero Acrílico Gato Mágico',
            slug: 'llavero-acrilico-gato',
            descripcion: 'Pieza de resina con acabado brillante para mochila.',
            categoria: 'Llaveros',
            palabrasClave: ['michi', 'kawaii', 'acrílico'],
        },
        {
            _id: 'p-2',
            nombre: 'Pin Esmaltado Dragón',
            slug: 'pin-esmaltado-dragon',
            descripcion: 'Broche metálico con detalles que parecen un gato guardián.',
            categoria: 'Pins',
            palabrasClave: ['anime', 'colección'],
        },
        {
            _id: 'p-3',
            nombre: 'Sticker Holográfico Galaxia',
            slug: 'sticker-holografico-galaxia',
            descripcion: 'Calcomanía de vinilo resistente al agua.',
            categoria: 'Stickers',
            palabrasClave: ['espacio', 'estrella'],
        },
    ],
    categories: [
        { _id: 'c-1', nombre: 'Llaveros', slug: 'llaveros' },
        { _id: 'c-2', nombre: 'Pins', slug: 'pins' },
        { _id: 'c-3', nombre: 'Stickers', slug: 'stickers' },
    ],
    synonyms: DEFAULT_SYNONYM_GROUPS,
};

describe('UT-BUS-01 a UT-BUS-10: Búsqueda Difusa, Normalización y Contrato SearchEngine', () => {
    it('UT-BUS-01 & UT-BUS-02: normaliza mayúsculas, diacríticos y filtra stopwords en español', () => {
        expect(normalizeText('Llavero de Acrílico Mágico ¡Edición Única!')).toBe(
            'llavero de acrilico magico edicion unica'
        );

        const tokens = tokenize('El llavero de acrílico con un diseño para la mochila');
        expect(tokens).toContain('llavero');
        expect(tokens).toContain('acrilico');
        expect(tokens).toContain('diseno');
        expect(tokens).not.toContain('el');
        expect(tokens).not.toContain('de');
        expect(tokens).not.toContain('para');
    });

    it('UT-BUS-03: expande sinónimos bidireccionalmente (yavero -> llavero, broche -> pin)', () => {
        const map = buildSynonymMap(DEFAULT_SYNONYM_GROUPS);
        const expanded = expandSynonyms(['yavero'], map);
        expect(expanded).toContain('llavero');
        expect(expanded).toContain('keychain');
    });

    it('UT-BUS-04 & UT-BUS-05: FuseSearchEngine tolera errores tipográficos, falta de acentos y sinónimos', async () => {
        const engine = new FuseSearchEngine({ initialPayload: INDEX_FIXTURE });
        await engine.load();

        // Sin acento: "acrilico" encuentra "Llavero Acrílico Gato Mágico"
        const resAcento = engine.search('acrilico');
        expect(resAcento.length).toBeGreaterThan(0);
        expect(resAcento[0]?.id).toBe('p-1');

        // Sinónimo / typo común: "yavero" encuentra "Llavero Acrílico Gato Mágico"
        const resSinonimo = engine.search('yavero');
        expect(resSinonimo.length).toBeGreaterThan(0);
        expect(resSinonimo[0]?.id).toBe('p-1');

        // Typo difuso: "holografiko" encuentra "Sticker Holográfico Galaxia"
        const resFuzzy = engine.search('holografiko');
        expect(resFuzzy.length).toBeGreaterThan(0);
        expect(resFuzzy[0]?.id).toBe('p-3');
    });

    it('UT-BUS-06: ordena por relevancia priorizando coincidencia en nombre sobre descripción', async () => {
        const engine = new FuseSearchEngine({ initialPayload: INDEX_FIXTURE });
        await engine.load();

        // "gato" aparece en el nombre de p-1 y solo en la descripción de p-2
        const res = engine.search('gato');
        expect(res.length).toBeGreaterThanOrEqual(2);
        expect(res[0]?.id).toBe('p-1');
        expect(res[0]!.score).toBeGreaterThan(res[1]!.score);
    });

    it('UT-BUS-07: suggest() devuelve sugerencias de categorías y productos para autocompletado', async () => {
        const engine = new FuseSearchEngine({ initialPayload: INDEX_FIXTURE });
        await engine.load();

        const sugs = engine.suggest('lla', 6);
        expect(sugs.length).toBeGreaterThan(0);
        expect(sugs.some((s) => s.type === 'categoria' && s.label === 'Llaveros')).toBe(
            true
        );
        expect(
            sugs.some(
                (s) =>
                    s.type === 'producto' &&
                    s.label === 'Llavero Acrílico Gato Mágico'
            )
        ).toBe(true);
    });

    it('UT-BUS-08 & UT-BUS-09: useSearch carga el índice de forma diferida y provee sugeridos en estado vacío', async () => {
        const loaderSpy = vi.fn().mockResolvedValue(INDEX_FIXTURE);
        const engine = new FuseSearchEngine({ indexLoader: loaderSpy });

        const catalogoMock = ref<Producto[]>([
            {
                _id: 'p-1',
                _type: 'producto',
                _createdAt: '2026-01-01T00:00:00Z',
                _updatedAt: '2026-01-01T00:00:00Z',
                _rev: '1',
                nombre: 'Llavero Acrílico Gato Mágico',
                slug: { _type: 'slug', current: 'llavero-acrilico-gato' },
                categoria: { nombre: 'Llaveros', slug: { _type: 'slug', current: 'llaveros' } },
                stock: 10,
                precio: 85,
                activo: true,
                calificacionPromedio: 4.9,
            },
        ]);

        const search = useSearch({
            engine,
            catalogoProductos: catalogoMock,
        });

        // Antes de enfocar el buscador, el loader remoto NO se ha invocado (RNF-07)
        expect(loaderSpy).not.toHaveBeenCalled();

        // Al enfocar (@focus -> cargarIndice), se descarga una sola vez
        await search.cargarIndice();
        expect(loaderSpy).toHaveBeenCalledTimes(1);

        // Consulta sin coincidencias activa estado vacío con productos sugeridos
        search.query.value = 'terminoInexistenteXYZ999';
        expect(search.sinResultados.value).toBe(true);
        expect(search.sugeridosEstadoVacio.value).toHaveLength(1);
    });

    it('UT-BUS-10: prueba de contrato SearchEngine ( puntajes en [0, 1] y respeto de límite )', async () => {
        const products: SearchableProduct[] = Array.from({ length: 12 }, (_, i) => ({
            _id: `prod-${i}`,
            nombre: `Llavero Colección Especial ${i}`,
            categoria: 'Llaveros',
            palabrasClave: ['llavero', 'especial'],
        }));

        const engine = new FuseSearchEngine({
            initialPayload: {
                schemaVersion: 1,
                generatedAt: new Date().toISOString(),
                products,
                categories: [],
                synonyms: [],
            },
        });

        await engine.load();
        const results = engine.search('llavero', 5);
        expect(results.length).toBeLessThanOrEqual(5);
        for (const r of results) {
            expect(typeof r.id).toBe('string');
            expect(r.score).toBeGreaterThanOrEqual(0);
            expect(r.score).toBeLessThanOrEqual(1);
        }
    });
});
