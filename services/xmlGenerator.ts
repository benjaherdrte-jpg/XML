
import type { ParsedDocument, ContentUnit, ContentPart } from '../types';

// Utilidad para escapar caracteres XML
const escapeXml = (unsafe: string | undefined): string => {
    if (typeof unsafe !== 'string') return '';
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
};

const alignmentMap: Record<string, string> = {
    'left': 'izquierda',
    'center': 'centrado',
    'right': 'derecha',
    'justify': 'justificado'
};

// Renderiza el contenido de texto aplicando estilos <en-origen> según manual (Pág 34)
const renderParts = (parts: ContentPart[] | undefined): string => {
    if (!parts || parts.length === 0) return '';
    
    return parts.map(part => {
        let content = escapeXml(part.text);
        
        // El manual indica que los estilos se manejan con <en-origen>
        if (part.isBold || part.isItalic || part.isSuperscript || part.isSubscript) {
            const styles: string[] = [];
            if (part.isBold) styles.push('peso-fuente="negrita"');
            if (part.isItalic) styles.push('estilo-fuente="cursiva"');
            
            // Nota: El manual no especifica super/sub en los ejemplos visibles, 
            // pero mantenemos la lógica semántica si es necesario.
            // Si el texto tiene estilo, lo envolvemos.
            if (styles.length > 0) {
                content = `<en-origen decoracion-texto="ninguna" ${styles.join(' ')}>${content}</en-origen>`;
            }
            if (part.isSuperscript) content = `<superindice>${content}</superindice>`;
            if (part.isSubscript) content = `<subindice>${content}</subindice>`;
        }

        if (part.url) content = `<dir-web url="${escapeXml(part.url)}">${content}</dir-web>`;
        if (part.isNote) content = `<nota ref="${escapeXml(part.noteRef)}" o="*"/>`;
        
        return content;
    }).join('');
};

// Renderiza una tabla según especificaciones Pág 30 del manual
const renderTable = (unit: ContentUnit): string => {
    const align = unit.alignment || 'center';
    const border = '1'; // Default visible border per manual examples
    const width = '100%'; // Default width
    
    // Las tablas pueden ir dentro de un paragraph si se agrupan, o directas.
    // El manual muestra tablas directas en capa.texto o dentro de paragraph.
    // Usaremos estructura estándar.
    
    let xml = `\n<table align="${align}" border="${border}" width="${width}">`;
    
    unit.rows?.forEach(row => {
        xml += `\n<tr>`;
        row.cells.forEach(cell => {
            const rowspan = cell.rowspan && cell.rowspan > 1 ? ` rowspan="${cell.rowspan}"` : '';
            const colspan = cell.colspan && cell.colspan > 1 ? ` colspan="${cell.colspan}"` : '';
            const cellAlign = cell.align ? ` align="${cell.align}"` : '';
            const valign = cell.valign ? ` valign="${cell.valign}"` : '';
            
            // Pág 30: El contenido de la celda DEBE estar en un <parrafo>
            const pAlign = cell.align ? ` alineacion-texto="${alignmentMap[cell.align] || 'izquierda'}"` : ' alineacion-texto="izquierda"';
            
            xml += `\n<td${cellAlign}${valign}${rowspan}${colspan}>`;
            xml += `<parrafo${pAlign} espaciado-anterior="simple">${renderParts(cell.parts)}</parrafo>`;
            xml += `</td>`;
        });
        xml += `\n</tr>`;
    });
    
    return xml + `\n</table>`;
};

// Renderiza un bloque de contenido (Párrafo, Tabla, Figura)
const renderContentBlock = (unit: ContentUnit): string => {
    if (unit.type === 'figure') {
        // Pág 26: <figura ref="..."/>
        return `\n<figura ref="${escapeXml(unit.ref || 'imagen_sin_ref')}"/>`;
    }

    if (unit.type === 'table') {
        return renderTable(unit);
    }

    if (unit.type === 'paragraph' || unit.type === 'note_definition') {
        // Pág 27: <paragraph id="..."><parrafo ...>...</parrafo></paragraph>
        // Generamos un ID si no existe, preferiblemente basado en contenido o secuencia
        const idAttr = unit.customId ? ` id="${escapeXml(unit.customId)}"` : ` id="PAR.${Math.floor(Math.random()*10000)}"`;
        const align = unit.alignment ? ` alineacion-texto="${alignmentMap[unit.alignment] || 'justificado'}"` : ' alineacion-texto="justificado"';
        
        return `\n<paragraph${idAttr}><parrafo${align} espaciado-anterior="simple">${renderParts(unit.parts)}</parrafo></paragraph>`;
    }

    return '';
};

// Función recursiva principal para renderizar Unidades
const renderUnit = (unit: ContentUnit): string => {
    // 1. Definición de la Unidad (Pág 21, 24)
    // Atributos: unidad (T, C, A...), parte (I, II, 1...), compl, superior
    const unitType = unit.level || 'A'; // Default a Artículo si no se detecta
    const parteAttr = unit.number ? ` parte="${escapeXml(unit.number)}"` : '';
    const superiorAttr = unit.superior ? ` superior="${escapeXml(unit.superior)}"` : '';
    // Nota: 'nmc' se menciona en el código anterior, añadir si está disponible
    
    let xml = `\n<unidad unidad="${escapeXml(unitType)}"${parteAttr}${superiorAttr}>`;

    // 2. Capa (Pág 25)
    // Contiene el título y el contenido DIRECTO de esta unidad (no sub-unidades)
    // La capa envuelve capa.texto
    const hasDirectContent = unit.title || (unit.parts && unit.parts.length > 0) || (unit.rows && unit.rows.length > 0) || unit.type === 'paragraph' || unit.type === 'table';
    
    if (hasDirectContent) {
        xml += `\n<capa papel="S">\n<capa.texto>`;
        
        // Título (Pág 25)
        if (unit.title || unit.number) {
            xml += `\n<titulo>`;
            if (unit.number) {
                // titulo.original parte="II" unidad="Capítulo"
                xml += `\n<titulo.original parte="${escapeXml(unit.number)}" unidad="${escapeXml(unitType)}"/>`;
            }
            if (unit.title) {
                xml += `\n<titulo.rubrica>${escapeXml(unit.title)}</titulo.rubrica>`;
            }
            xml += `\n</titulo>`;
        }

        // Si la unidad es una "hoja" (párrafo/tabla) la renderizamos aquí
        if (unit.type !== 'structural_header') {
            xml += renderContentBlock(unit);
        }

        xml += `\n</capa.texto>\n</capa>`;
    }

    // 3. Sub-unidades (Hijos)
    // Importante: Los hijos se renderizan DENTRO de <unidad> pero FUERA de la <capa> del padre
    if (unit.children && unit.children.length > 0) {
        unit.children.forEach(child => {
            xml += renderUnit(child);
        });
    }

    // 4. Cierre Unidad
    xml += `\n</unidad>`;
    return xml;
};

// Reconstruye el árbol jerárquico basado en el "Stack" lógico visual
const buildTree = (items: ContentUnit[]): ContentUnit[] => {
    const root: ContentUnit[] = [];
    const stack: ContentUnit[] = []; 

    items.forEach((item) => {
        // Limpiar propiedades 'children' para evitar duplicados si se reprocesa
        item.children = [];

        if (item.type === 'structural_header') {
            const level = item.level || '';
            
            if (level === 'PRE') {
                stack.length = 0; 
                root.push(item);
                stack.push(item);
            } 
            else if (['RB', 'TIT', 'C', 'S', 'SS'].includes(level)) {
                // Lógica simplificada: Se anida en el último contenedor verde o rojo
                // En una implementación real estricta, verificaríamos la jerarquía exacta (TIT > C > S)
                if (stack.length > 0) {
                    stack[stack.length - 1].children!.push(item);
                    stack.push(item); // Este se convierte en el nuevo padre activo
                } else {
                    root.push(item);
                    stack.push(item);
                }
            } 
            else if (level === 'A' || level === 'TR') { // Artículos o Transitorios
                // Son hijos del contenedor actual, pero NO se convierten en contenedores de otros Artículos
                if (stack.length > 0) {
                    stack[stack.length - 1].children!.push(item);
                } else {
                    root.push(item);
                }
                // Mantenemos el stack igual (el padre sigue siendo el Título/Capítulo)
                // PERO necesitamos saber dónde meter los párrafos siguientes.
                // Truco: Usamos una propiedad temporal para saber cuál es la unidad activa para contenido
                // Modificamos el item actual para que sea el receptor de contenido plano
                // (No se mete al stack estructural principal para no anidar Artículos dentro de Artículos)
            }
        } else {
            // Contenido plano (Párrafos, Tablas sin unidad estructural explícita)
            // Buscar dónde insertarlo
            
            // 1. Buscar en el último hijo del último elemento del stack (ej: El último Artículo dentro del Capítulo actual)
            const currentContainer = stack.length > 0 ? stack[stack.length - 1] : null;
            
            if (currentContainer) {
                const lastChild = currentContainer.children && currentContainer.children.length > 0 
                    ? currentContainer.children[currentContainer.children.length - 1] 
                    : null;

                // Si el último hijo es un Artículo (A), metemos el párrafo ahí
                if (lastChild && (lastChild.level === 'A' || lastChild.level === 'TR')) {
                    if (!lastChild.children) lastChild.children = [];
                    lastChild.children.push(item);
                } else {
                    // Si no, lo metemos directo en el contenedor (ej: un párrafo introductorio de un Capítulo)
                    // Convertimos este párrafo en una pseudo-unidad si es necesario, o lo tratamos como contenido de capa
                    // Para simplificar renderUnit, lo adjuntamos como hijo, y renderUnit sabrá que si no es structural_header es contenido
                    currentContainer.children!.push(item);
                }
            } else {
                root.push(item);
            }
        }
    });

    return root;
};

export const convertJsonToXml = (data: ParsedDocument, originalFilename: string) => {
    const pubDate = data.metadata?.publicationDate || '';
    const dateMatch = pubDate.match(/\d{4}/);
    const year = dateMatch ? dateMatch[0] : new Date().getFullYear().toString();
    // Formato fecha Pág 15: <statute-date.date value="20140421"...
    const dateVal = pubDate.replace(/\D/g, '').substring(0, 8) || new Date().toISOString().split('T')[0].replace(/-/g, '');
    
    const tree = buildTree(data.content || []);
    
    let bodyContent = '';
    // Aseguramos una unidad raíz si no existe, o procesamos el árbol
    tree.forEach(node => {
        bodyContent += renderUnit(node);
    });

    // Estructura Root Pág 24: <docs><legis>...
    const contentXml = `<?xml version="1.0" encoding="utf-8"?>\n<docs>\n<legis>\n<marginal>\n<nmp>LEG</nmp>\n<nma>${year}</nma>\n<nmn>0</nmn>\n</marginal>\n<texto idioma="spa" definitivo="S">\n${bodyContent}\n</texto>\n</legis>\n</docs>`;

    const processId = Math.floor(Math.random() * 9000000) + 1000000;
    
    return {
        metadata: generateMetadataXml(data, dateVal),
        content: contentXml,
        metadataFilename: `LEG_PO_${processId}_${dateVal}_cab.xml`, // Ajuste formato Pág 23
        contentFilename: `LEG_PO_${processId}_${dateVal}_txt.xml`,
    };
};

const generateMetadataXml = (data: ParsedDocument, dateVal: string): string => {
    // Generación de metadatos según Pág 11 y siguientes
    return `<?xml version="1.0" encoding="utf-8"?>\n<docs>\n\t<legis-doc>\n\t\t<legis-metadatas>\n\t\t\t<legis-metadata type="LG" lang="spa">\n\t\t\t\t<languages><language-definition base="Y" official="Y">spa</language-definition></languages>\n\t\t\t\t<statute>\n\t\t\t\t\t<statute-data order="1" plural="N">\n\t\t\t\t\t\t<statute-type><statute-type.value>${escapeXml(data.metadata?.documentType || 'DECRETO')}</statute-type.value></statute-type>\n\t\t\t\t\t\t<statute-date order="1"><statute-date.date value="${dateVal}" precision="dd/MM/yyyy"/></statute-date>\n\t\t\t\t\t</statute-data>\n\t\t\t\t</statute>\n\t\t\t\t<publications>\n\t\t\t\t\t<publication principal="Y" order="1">\n\t\t\t\t\t\t<publication.name><publication.name.value>${escapeXml(data.metadata?.publicationSource || 'GACETA OFICIAL')}</publication.name.value></publication.name>\n\t\t\t\t\t\t<publication.date value="${dateVal}" precision="dd/MM/yyyy"/>\n\t\t\t\t\t</publication>\n\t\t\t\t</publications>\n\t\t\t\t<resumen-leg>\n\t\t\t\t\t<resumen idioma="spa" oficial="s"><parrafo>${escapeXml(data.metadata?.documentTitle || 'SIN TITULO')}</parrafo></resumen>\n\t\t\t\t</resumen-leg>\n\t\t\t\t<practice-areas>\n\t\t\t\t\t<practice-area order="99" principal="Y"><name-area>${escapeXml(data.metadata?.thematicArea || 'General')}</name-area></practice-area>\n\t\t\t\t</practice-areas>\n\t\t\t</legis-metadata>\n\t\t</legis-metadatas>\n\t</legis-doc>\n</docs>`;
};
