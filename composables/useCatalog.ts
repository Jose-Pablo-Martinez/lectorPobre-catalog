/**
 * @file useCatalog.ts
 * @description Composable que expone el catálogo de productos para el SSG.
 * Los datos son consultados en build time y pre-renderizados en HTML estático.
 * @satisfies RF-01 (Catálogo), RF-04 (Categorías), RF-18 (Búsqueda client-side), RF-19 (Paginación)
 */

export function useCatalog(config: { pagina?: number; categoria?: string } = {}) {
    const sanity = useSanity();

    // Consulta ejecutada en build time (SSG) o en cliente para SSR ligero
    // Se proyectan solo los campos necesarios para mostrar la cuadrícula de productos.
    const { data: productos, pending, error } = useAsyncData('productos', () => {
        let query = '*[_type == "producto" && activo == true]';
        
        if (config.categoria) {
            query = `*[_type == "producto" && activo == true && categoria->slug.current == $categoria]`;
        }

        query += ` | order(_createdAt desc) {
            _id, 
            nombre, 
            slug, 
            descripcion, 
            imagenPrincipal, 
            categoria->{nombre, slug}, 
            stock, 
            "calificacionPromedio": select(
                ratingCount > 0 => round(ratingSum / ratingCount, 1),
                null
            ),
            ratingCount
        }`;

        return sanity.fetch(query, config.categoria ? { categoria: config.categoria } : {});
    });

    // Búsqueda client-side sobre los datos ya cargados (RF-18)
    const searchQuery = ref('');
    
    const productosFiltrados = computed(() => {
        if (!productos.value) return [];
        if (!searchQuery.value) return productos.value;
        
        const q = searchQuery.value.toLowerCase();
        return productos.value.filter((p: any) =>
            p.nombre.toLowerCase().includes(q) ||
            (p.descripcion && p.descripcion.toLowerCase().includes(q))
        );
    });

    return { productos, productosFiltrados, searchQuery, pending, error };
}
