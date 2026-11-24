/**
 * @file BaseSelect.test.ts
 * @description Pruebas unitarias para `components/BaseSelect.vue`: renderizado inicial,
 * apertura/cierre táctil y de escritorio, emisión de cambios, cierre al pulsar fuera o
 * en el backdrop móvil, y navegación por teclado (ArrowDown, ArrowUp, Escape).
 * @satisfies RF-01, RF-04, RF-15, RNF-05
 */

import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import BaseSelect from '~/components/BaseSelect.vue';

const OPCIONES_DEMO = [
    { value: 'aleatorio', label: 'Aleatorio' },
    { value: 'recientes', label: 'Más recientes' },
    { value: 'precio_asc', label: 'Precio: menor a mayor' },
];

describe('BaseSelect.vue', () => {
    let wrapper: ReturnType<typeof mount> | null = null;

    afterEach(() => {
        wrapper?.unmount();
        wrapper = null;
    });

    it('inicia cerrado mostrando la etiqueta de la opción seleccionada o placeholder de respaldo', async () => {
        wrapper = mount(BaseSelect, {
            props: {
                modelValue: 'recientes',
                options: OPCIONES_DEMO,
                label: 'Ordenar por',
                placeholder: 'Elige un orden',
                testIdPrefix: 'demo-select',
            },
        });

        const trigger = wrapper.find('[data-testid="demo-select-trigger"]');
        expect(trigger.exists()).toBe(true);
        expect(trigger.text()).toContain('Más recientes');
        expect(trigger.attributes('aria-expanded')).toBe('false');
        expect(wrapper.find('[data-testid="demo-select-panel"]').exists()).toBe(false);

        await wrapper.setProps({ modelValue: 'inexistente' });
        expect(trigger.text()).toContain('Elige un orden');
    });

    it('abre el panel al hacer clic, emite update:modelValue al elegir una opción y cierra', async () => {
        wrapper = mount(BaseSelect, {
            attachTo: document.body,
            props: {
                modelValue: 'aleatorio',
                options: OPCIONES_DEMO,
                label: 'Ordenar por',
                testIdPrefix: 'demo-select',
            },
        });

        await wrapper.find('[data-testid="demo-select-trigger"]').trigger('click');
        expect(wrapper.find('[data-testid="demo-select-trigger"]').attributes('aria-expanded')).toBe('true');
        const panel = wrapper.find('[data-testid="demo-select-panel"]');
        expect(panel.exists()).toBe(true);
        expect(panel.findAll('[data-select-option]')).toHaveLength(3);

        await wrapper.find('[data-testid="demo-select-option-precio_asc"]').trigger('click');
        expect(wrapper.emitted('update:modelValue')).toEqual([['precio_asc']]);
        expect(wrapper.find('[data-testid="demo-select-panel"]').exists()).toBe(false);
    });

    it('cierra con el botón close del Bottom Sheet móvil, con el backdrop y con clic fuera', async () => {
        wrapper = mount(BaseSelect, {
            attachTo: document.body,
            props: {
                modelValue: 'aleatorio',
                options: OPCIONES_DEMO,
                label: 'Ordenar por',
                testIdPrefix: 'demo-select',
            },
        });

        const trigger = wrapper.find('[data-testid="demo-select-trigger"]');

        // Cierre mediante botón close móvil
        await trigger.trigger('click');
        expect(wrapper.find('[data-testid="demo-select-panel"]').exists()).toBe(true);
        await wrapper.find('[data-testid="demo-select-close"]').trigger('click');
        expect(wrapper.find('[data-testid="demo-select-panel"]').exists()).toBe(false);

        // Cierre mediante backdrop móvil
        await trigger.trigger('click');
        await wrapper.find('[data-testid="demo-select-backdrop"]').trigger('click');
        expect(wrapper.find('[data-testid="demo-select-panel"]').exists()).toBe(false);

        // Cierre mediante pointerdown fuera del componente
        await trigger.trigger('click');
        expect(wrapper.find('[data-testid="demo-select-panel"]').exists()).toBe(true);
        document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
        await wrapper.vm.$nextTick();
        expect(wrapper.find('[data-testid="demo-select-panel"]').exists()).toBe(false);
    });

    it('permite abrir y navegar opciones con ArrowDown/ArrowUp y cerrar con Escape', async () => {
        wrapper = mount(BaseSelect, {
            attachTo: document.body,
            props: {
                modelValue: 'aleatorio',
                options: OPCIONES_DEMO,
                label: 'Ordenar por',
                testIdPrefix: 'demo-select',
            },
        });

        const trigger = wrapper.find('[data-testid="demo-select-trigger"]');
        await trigger.trigger('keydown', { key: 'ArrowDown' });
        await wrapper.vm.$nextTick();

        expect(wrapper.find('[data-testid="demo-select-panel"]').exists()).toBe(true);
        expect((document.activeElement as HTMLElement | null)?.dataset.testid).toBe(
            'demo-select-option-aleatorio'
        );

        await wrapper.find('[data-testid="demo-select-option-aleatorio"]').trigger('keydown', {
            key: 'ArrowDown',
        });
        expect((document.activeElement as HTMLElement | null)?.dataset.testid).toBe(
            'demo-select-option-recientes'
        );

        await wrapper.find('[data-testid="demo-select-option-recientes"]').trigger('keydown', {
            key: 'ArrowUp',
        });
        expect((document.activeElement as HTMLElement | null)?.dataset.testid).toBe(
            'demo-select-option-aleatorio'
        );

        await wrapper.find('[data-testid="demo-select-option-aleatorio"]').trigger('keydown', {
            key: 'Escape',
        });
        expect(wrapper.find('[data-testid="demo-select-panel"]').exists()).toBe(false);
    });
});
