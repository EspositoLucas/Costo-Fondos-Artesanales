// --- Elementos del DOM ---
const form = document.getElementById('articuloForm');
const nombreArticuloInput = document.getElementById('nombreArticulo');
const clienteInput = document.getElementById('cliente');
const fechaInput = document.getElementById('fecha');
const caracteristicasInput = document.getElementById('caracteristicas');
const componentesCostoDiv = document.getElementById('componentesCosto');
const addComponenteBtn = document.getElementById('addComponenteBtn');
const markupInput = document.getElementById('markup');
const costoTotalSpan = document.getElementById('costoTotal');
const precioFinalSpan = document.getElementById('precioFinal');
const calcularBtn = document.getElementById('calcularBtn');
const guardarBtn = document.getElementById('guardarBtn');
const limpiarBtn = document.getElementById('limpiarBtn');
const historialBody = document.getElementById('historialBody');
const snackbar = document.getElementById('snackbar');
const fotoInput = document.getElementById('foto');
const fotoPreviewContainer = document.getElementById('fotoPreviewContainer');
const fotoPreview = document.getElementById('fotoPreview');
const fotoPlaceholder = document.getElementById('fotoPlaceholder');
const clearFotoBtn = document.getElementById('clearFotoBtn');
const buscarArticuloInput = document.getElementById('buscarArticulo');
let currentEditingId = null;

// Clave para localStorage
const STORAGE_KEY = 'articulosCalzado';

// --- Funciones ---

// Mostrar mensajes flotantes (snackbar)
function showSnackbar(message, type = 'info') {
    snackbar.textContent = message;
    snackbar.className = 'fixed bottom-4 right-4 px-4 py-2 rounded-md shadow-lg text-white transition-opacity duration-300 opacity-0 z-50'; // Reset classes
    if (type === 'error') snackbar.classList.add('bg-red-600');
    else if (type === 'success') snackbar.classList.add('bg-green-600');
    else if (type === 'info') snackbar.classList.add('bg-blue-600');
    else snackbar.classList.add('bg-gray-800');
    snackbar.classList.add('opacity-100');
    setTimeout(() => {
        snackbar.classList.remove('opacity-100');
        snackbar.classList.add('opacity-0');
    }, 3000);
}

// Evaluar expresión matemática simple de forma segura
function safeEval(expression) {
    if (typeof expression !== 'string' || expression.trim() === '') return NaN;
    expression = expression.replace(/,/g, '.');
    // Relaxed regex to allow more flexibility but still basic safety
    // Allows numbers, decimal points, +, -, *, /, (, ), and whitespace
    if (!/^[0-9.+\-*/()\s]*$/.test(expression)) {
        console.error("[safeEval] Cálculo inválido (caracteres no permitidos):", expression);
        return NaN;
    }
    try {
        // Using Function constructor for slightly safer eval than direct eval()
        const result = new Function('return ' + expression)();
        return isFinite(result) ? result : NaN;
    } catch (e) {
        console.error("[safeEval] Error durante la evaluación:", expression, e);
        return NaN;
    }
}


// Calcular costos totales y precio final
function calcularCostos() {
    let costoTotalCalculado = 0;
    const componentes = componentesCostoDiv.querySelectorAll('.component-input-group');
    let todosCalculosValidos = true;

    componentes.forEach(comp => {
        // Calcular costo del componente principal
        const costoInput = comp.querySelector('.component-cost');
        const costoValue = costoInput.value.trim();
        let costoComponente = 0;
        costoInput.classList.remove('border-red-500');
        delete costoInput.dataset.errorShown;

        if (costoValue) {
            costoComponente = safeEval(costoValue);
            if (isNaN(costoComponente)) {
                if (!costoInput.dataset.errorShown) {
                    showSnackbar(`Cálculo inválido: "${costoValue}". Revisa la expresión.`, 'error');
                    costoInput.dataset.errorShown = 'true';
                }
                costoInput.classList.add('border-red-500');
                todosCalculosValidos = false;
                costoComponente = 0;
            }
        }

        // Calcular costos de subcomponentes
        const subcomponentes = comp.querySelectorAll('.subcomponent-cost');
        subcomponentes.forEach(subInput => {
            const subValue = subInput.value.trim();
            let subCosto = 0;
            subInput.classList.remove('border-red-500');
            delete subInput.dataset.errorShown;

            if (subValue) {
                subCosto = safeEval(subValue);
                if (isNaN(subCosto)) {
                    if (!subInput.dataset.errorShown) {
                        showSnackbar(`Cálculo inválido en subcomponente: "${subValue}". Revisa la expresión.`, 'error');
                        subInput.dataset.errorShown = 'true';
                    }
                    subInput.classList.add('border-red-500');
                    todosCalculosValidos = false;
                    subCosto = 0;
                }
            }
            costoComponente += subCosto;
        });

        costoTotalCalculado += costoComponente;
    });

    const markup = parseFloat(markupInput.value) || 0;
    const precioFinalCalculado = costoTotalCalculado * markup;
    const formatCurrency = (value) => value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    costoTotalSpan.textContent = `$ ${formatCurrency(costoTotalCalculado)}`;
    precioFinalSpan.textContent = `$ ${formatCurrency(precioFinalCalculado)}`;
    return { costoTotal: costoTotalCalculado, precioFinal: precioFinalCalculado, calculoValido: todosCalculosValidos };
}

// Añadir un nuevo campo de componente al formulario
function agregarComponente(nombre = '', costo = '', subcomponentes = []) {
    const div = document.createElement('div');
    div.className = 'component-input-group';
    
    // Crear el HTML para el componente principal
    div.innerHTML = `
        <div class="component-main">
            <input type="text" placeholder="Nombre Componente (Ej: Suela)" value="${nombre}" 
                   class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm component-name">
            <input type="text" placeholder="Costo o Cálculo (Ej: 3000 o 450*1.2)" value="${costo}" 
                   class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm component-cost">
            <div class="flex space-x-2">
                <button type="button" class="add-subcomponent-button" title="Añadir subcomponente">
                    Agregar Subcomponente
                </button>
                <button type="button" class="delete-button-text" title="Eliminar componente">
                    Eliminar
                </button>
            </div>
        </div>
        <div class="subcomponents-container space-y-2 mt-2 ml-4 border-l-2 border-gray-200 pl-4">
            <!-- Los subcomponentes se añadirán aquí -->
        </div>
    `;

    // Agregar listeners para los botones
    const addSubcomponentBtn = div.querySelector('.add-subcomponent-button');
    const deleteButton = div.querySelector('.delete-button-text');
    const costInput = div.querySelector('.component-cost');
    const subcomponentsContainer = div.querySelector('.subcomponents-container');

    // Listener para añadir subcomponente
    addSubcomponentBtn.addEventListener('click', () => {
        const subcomponentDiv = document.createElement('div');
        subcomponentDiv.className = 'subcomponent-input-group';
        subcomponentDiv.innerHTML = `
            <input type="text" placeholder="Nombre Subcomponente" 
                   class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm subcomponent-name">
            <input type="text" placeholder="Costo o Cálculo" 
                   class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm subcomponent-cost">
            <button type="button" class="delete-button-text" title="Eliminar subcomponente">
                Eliminar
            </button>
        `;

        // Agregar listener para el costo del subcomponente
        const subcomponentCostInput = subcomponentDiv.querySelector('.subcomponent-cost');
        subcomponentCostInput.addEventListener('input', () => {
            calcularCostoComponente(div);
            calcularCostos();
        });
        subcomponentCostInput.addEventListener('blur', () => {
            calcularCostoComponente(div);
            calcularCostos();
        });

        // Agregar listener para el botón de eliminar
        const deleteSubcomponentBtn = subcomponentDiv.querySelector('.delete-button-text');
        deleteSubcomponentBtn.addEventListener('click', () => {
            subcomponentDiv.remove();
            calcularCostoComponente(div);
            calcularCostos();
        });

        subcomponentsContainer.appendChild(subcomponentDiv);
        // Cuando se agrega un subcomponente, hacer el costo del componente principal readonly
        costInput.readOnly = true;
    });

    // Listener para el costo del componente principal
    costInput.addEventListener('input', () => {
        // Solo recalcular si no hay subcomponentes
        if (subcomponentsContainer.children.length === 0) {
            calcularCostos();
        }
    });
    costInput.addEventListener('blur', () => {
        // Solo recalcular si no hay subcomponentes
        if (subcomponentsContainer.children.length === 0) {
            calcularCostos();
        }
    });

    // Listener para el botón de eliminar
    deleteButton.addEventListener('click', () => eliminarComponente(deleteButton));

    componentesCostoDiv.appendChild(div);

    // Cargar subcomponentes si existen
    if (subcomponentes && subcomponentes.length > 0) {
        subcomponentes.forEach(sub => {
            const subcomponentDiv = document.createElement('div');
            subcomponentDiv.className = 'subcomponent-input-group';
            subcomponentDiv.innerHTML = `
                <input type="text" placeholder="Nombre Subcomponente" value="${sub.nombre}" 
                       class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm subcomponent-name">
                <input type="text" placeholder="Costo o Cálculo" value="${sub.costo}" 
                       class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm subcomponent-cost">
                <button type="button" class="delete-button-text" title="Eliminar subcomponente">
                    Eliminar
                </button>
            `;

            // Agregar listeners para el subcomponente
            const subcomponentCostInput = subcomponentDiv.querySelector('.subcomponent-cost');
            subcomponentCostInput.addEventListener('input', () => {
                calcularCostoComponente(div);
                calcularCostos();
            });
            subcomponentCostInput.addEventListener('blur', () => {
                calcularCostoComponente(div);
                calcularCostos();
            });

            const deleteSubcomponentBtn = subcomponentDiv.querySelector('.delete-button-text');
            deleteSubcomponentBtn.addEventListener('click', () => {
                subcomponentDiv.remove();
                calcularCostoComponente(div);
                calcularCostos();
            });

            subcomponentsContainer.appendChild(subcomponentDiv);
        });
        // Si hay subcomponentes, hacer el costo del componente principal readonly
        costInput.readOnly = true;
    }

    // Calcular el costo inicial del componente
    calcularCostoComponente(div);
}

// Agregar nueva función para calcular el costo de un componente
function calcularCostoComponente(componentDiv) {
    const costInput = componentDiv.querySelector('.component-cost');
    const subcomponentsContainer = componentDiv.querySelector('.subcomponents-container');
    const subcomponentes = componentDiv.querySelectorAll('.subcomponent-cost');

    // Si no hay subcomponentes, permitir edición directa del costo
    if (subcomponentes.length === 0) {
        costInput.readOnly = false;
        return;
    }

    // Si hay subcomponentes, calcular la suma automáticamente
    let costoTotal = 0;
    subcomponentes.forEach(subInput => {
        const subValue = subInput.value.trim();
        if (subValue) {
            const subCosto = safeEval(subValue);
            if (!isNaN(subCosto)) {
                costoTotal += subCosto;
            }
        }
    });

    // Actualizar el costo total del componente
    costInput.value = costoTotal.toFixed(2);
    costInput.readOnly = true;
}

// Eliminar un campo de componente del formulario
function eliminarComponente(button) {
    button.closest('.component-input-group').remove();
    calcularCostos(); // Recalculate after removing
}

// Manejar selección y previsualización de imagen
function handleFotoSelection(event) {
    const file = event.target.files[0];
    console.log("[handleFotoSelection] Archivo seleccionado:", file);

    if (!file) {
        clearImagePreview();
        return;
    }

    // Validación básica de tipo de archivo
    if (!file.type.startsWith('image/')) {
        showSnackbar('Por favor, selecciona un archivo de imagen válido (JPEG, PNG, GIF, etc.).', 'error');
        clearImagePreview();
        return;
    }

    // Validación de tamaño (ej: 5MB)
    const maxSize = 5 * 1024 * 1024; // 5 MB en bytes
    if (file.size > maxSize) {
        showSnackbar(`El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(1)}MB). El tamaño máximo es 5MB.`, 'error');
        clearImagePreview();
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        console.log("[handleFotoSelection] Archivo leído, mostrando previsualización.");
        fotoPreview.src = e.target.result;
        fotoPreview.style.display = 'block';
        fotoPlaceholder.style.display = 'none';
        fotoPreviewContainer.style.display = 'flex'; // Make container visible
        clearFotoBtn.style.display = 'inline-block'; // Show clear button
    }

    reader.onerror = function(e) {
        console.error("[handleFotoSelection] Error al leer el archivo:", e);
        showSnackbar('Error al leer el archivo de imagen.', 'error');
        clearImagePreview();
    }

    reader.readAsDataURL(file); // Lee el archivo como Data URL
}

// Limpiar la previsualización de imagen y el input
function clearImagePreview() {
    console.log("[clearImagePreview] Limpiando previsualización de imagen.");
    fotoInput.value = ''; // Resetea el input de archivo
    fotoPreview.src = '#'; // Limpia la fuente de la imagen
    fotoPreview.style.display = 'none';
    fotoPlaceholder.style.display = 'block';
    // No ocultamos el contenedor si ya se mostró una vez, mantenemos el área dashed
    // fotoPreviewContainer.style.display = 'none';
    clearFotoBtn.style.display = 'none'; // Oculta el botón de borrar
}

// Limpiar el formulario para ingresar un nuevo artículo
function limpiarFormulario() {
    console.log("[limpiarFormulario] Limpiando formulario...");
    form.reset(); // Resets form fields to default values
    componentesCostoDiv.innerHTML = ''; // Clear dynamic components
    agregarComponente(); // Add one empty component row back
    clearImagePreview(); // Limpia la previsualización de la imagen

    // Set date to today
    try {
        fechaInput.valueAsDate = new Date();
    } catch (e) { // Fallback for browsers not supporting valueAsDate
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const dd = String(today.getDate()).padStart(2, '0');
        fechaInput.value = `${yyyy}-${mm}-${dd}`;
    }

    costoTotalSpan.textContent = '$ 0.00';
    precioFinalSpan.textContent = '$ 0.00';
    markupInput.value = '1.8'; // Reset markup to default
    console.log(`[limpiarFormulario] Estableciendo currentEditingId a null (antes era: ${currentEditingId})`);
    currentEditingId = null; // Ensure we are not in editing mode

    // Reset Guardar button appearance
    guardarBtn.textContent = 'Guardar Artículo';
    guardarBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
    guardarBtn.classList.add('bg-green-600', 'hover:bg-green-700');

    // Clear any visual error states on cost inputs
    componentesCostoDiv.querySelectorAll('.component-cost.border-red-500').forEach(input => {
        input.classList.remove('border-red-500');
        delete input.dataset.errorShown;
    });

    showSnackbar('Formulario listo para un nuevo artículo.', 'info');
    console.log("[limpiarFormulario] Formulario limpiado.");
}

// Obtener artículos de localStorage con manejo de errores
function getArticulosFromStorage() {
    console.log("[getArticulosFromStorage] Intentando obtener artículos de localStorage...");
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) {
            console.log("[getArticulosFromStorage] No se encontraron datos en localStorage.");
            return [];
        }
        console.log("[getArticulosFromStorage] Datos encontrados, intentando parsear...");
        const parsedData = JSON.parse(data);
        // Basic validation: check if it's an array
        if (!Array.isArray(parsedData)) {
             console.warn("[getArticulosFromStorage] Datos corruptos: No es un array. Devolviendo array vacío.");
             localStorage.removeItem(STORAGE_KEY); // Attempt to clear corrupted data
             return [];
        }
        console.log(`[getArticulosFromStorage] Datos parseados con éxito. ${parsedData.length} artículos encontrados.`);
        return parsedData;
    } catch (error) {
        console.error("[getArticulosFromStorage] Error al leer o parsear datos:", error);
        showSnackbar("Error al cargar el historial. Datos podrían estar corruptos.", "error");
        return []; // Return empty array on error
    }
}

// Guardar artículos en localStorage con manejo de errores
function saveArticulosToStorage(articulos) {
     console.log("[saveArticulosToStorage] Intentando guardar artículos en localStorage:", articulos);
     if (!Array.isArray(articulos)) {
         console.error("[saveArticulosToStorage] Error: Se intentó guardar algo que no es un array.");
         showSnackbar("Error interno al intentar guardar los datos.", "error");
         return false;
     }
     try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(articulos));
        console.log("[saveArticulosToStorage] Artículos guardados con éxito.");
        return true;
    } catch (error) {
        console.error("[saveArticulosToStorage] Error al guardar datos:", error);
        // Check for QuotaExceededError specifically
        if (error.name === 'QuotaExceededError' || (error.code === 22 || error.code === 1014)) { // Browser variations for quota error
             showSnackbar("Error: No hay suficiente espacio para guardar. Considera eliminar artículos antiguos.", "error");
        } else {
             showSnackbar("Error inesperado al guardar el artículo en el almacenamiento local.", "error");
        }
        return false;
    }
}


// Guardar el artículo actual (nuevo o editado)
function guardarArticulo(event) {
    console.log("[guardarArticulo] Intento de guardado iniciado...");
    event.preventDefault(); // Prevent default form submission

    // Recalculate just before saving to ensure data is fresh
    const { costoTotal, precioFinal, calculoValido } = calcularCostos();

    if (!calculoValido) {
        console.warn("[guardarArticulo] Guardado cancelado: Cálculos inválidos.");
        showSnackbar('No se puede guardar. Corrige los errores en los cálculos de componentes.', 'error');
        return; // Stop saving if there are calculation errors
    }

    // Modificar la recolección de componentes para incluir subcomponentes
    const componentes = Array.from(componentesCostoDiv.querySelectorAll('.component-input-group')).map(comp => {
        const subcomponentes = Array.from(comp.querySelectorAll('.subcomponent-input-group')).map(sub => ({
            nombre: sub.querySelector('.subcomponent-name').value.trim(),
            costo: sub.querySelector('.subcomponent-cost').value.trim()
        })).filter(sub => sub.nombre || sub.costo);

        return {
            nombre: comp.querySelector('.component-name').value.trim(),
            costo: comp.querySelector('.component-cost').value.trim(),
            subcomponentes: subcomponentes
        };
    }).filter(comp => comp.nombre || comp.costo || comp.subcomponentes.length > 0);

    // Obtener Data URL de la imagen si existe
    const fotoDataUrl = fotoPreview.src.startsWith('data:image') ? fotoPreview.src : null;
    if (fotoDataUrl) {
        console.log(`[guardarArticulo] Se guardará imagen (Data URL de ${Math.round(fotoDataUrl.length / 1024)} KB).`);
    } else {
        console.log("[guardarArticulo] No se seleccionó imagen o la previsualización está vacía.");
    }

    // Generate ID if new, use existing if editing
    const idParaGuardar = currentEditingId || Date.now().toString();
    console.log(`[guardarArticulo] ID para guardar/actualizar: ${idParaGuardar}. currentEditingId: ${currentEditingId}`);

    // Create the article object
    const articulo = {
        id: idParaGuardar,
        nombre: nombreArticuloInput.value.trim(),
        cliente: clienteInput.value.trim(),
        fecha: fechaInput.value,
        caracteristicas: caracteristicasInput.value.trim(),
        componentes: componentes,
        markup: parseFloat(markupInput.value) || 1.8, // Store the markup used
        costoTotal: costoTotal, // Store calculated total cost
        precioFinal: precioFinal, // Store calculated final price
        fotoDataUrl: fotoDataUrl // Guarda el Data URL de la imagen
    };
    console.log("[guardarArticulo] Objeto artículo creado:", articulo);

    // Basic validation for required fields
    if (!articulo.nombre || !articulo.cliente || !articulo.fecha) {
        console.warn("[guardarArticulo] Guardado cancelado: Faltan campos requeridos (Nombre, Cliente o Fecha).");
        showSnackbar('Por favor, completa Nombre Artículo, Cliente y Fecha.', 'error');
        return;
    }

    const articulosGuardados = getArticulosFromStorage();
    let updated = false;
    let foundIndex = -1;

    if (currentEditingId) {
        console.log(`[guardarArticulo] Modo Edición: Buscando índice para ID ${currentEditingId}`);
        const index = articulosGuardados.findIndex(a => a.id === currentEditingId);
        foundIndex = index;
        if (index > -1) {
            console.log(`[guardarArticulo] Artículo encontrado en índice ${index}. Actualizando...`);
            articulosGuardados[index] = articulo; // Replace the item at the index
            updated = true;
        } else {
            // This case should ideally not happen if UI logic is correct
            console.warn(`[guardarArticulo] ID de edición ${currentEditingId} no encontrado en storage! Añadiendo como nuevo.`);
            articulosGuardados.push(articulo); // Add as new if ID mismatch somehow
        }
    } else {
        console.log("[guardarArticulo] Modo Nuevo: Añadiendo artículo a la lista.");
        articulosGuardados.push(articulo); // Add the new article
    }

    console.log(`[guardarArticulo] Lista de artículos después de ${updated ? 'actualizar (índice: ' + foundIndex + ')' : 'añadir'}:`, articulosGuardados);

    // Attempt to save the updated list
    if (saveArticulosToStorage(articulosGuardados)) {
         showSnackbar(`Artículo "${articulo.nombre}" ${updated ? 'actualizado' : 'guardado'} con éxito.`, 'success');
         console.log("[guardarArticulo] Llamando a cargarHistorial() y limpiarFormulario().");
         cargarHistorial(); // Refresh the history table
         limpiarFormulario(); // Reset the form for the next entry
    } else {
         console.error("[guardarArticulo] Falló saveArticulosToStorage.");
         // Error snackbar should have been shown by saveArticulosToStorage
    }
    console.log("[guardarArticulo] Proceso de guardado finalizado.");
}


// Cargar el historial desde localStorage y mostrarlo en la tabla
function cargarHistorial() {
    console.log("[cargarHistorial] Cargando historial...");
    const articulosGuardados = getArticulosFromStorage();
    historialBody.innerHTML = ''; // Clear previous content

    if (articulosGuardados.length === 0) {
        console.log("[cargarHistorial] No hay artículos en el historial.");
        historialBody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">No hay artículos guardados.</td></tr>'; // Colspan aumentado a 7
        return;
    }

    console.log(`[cargarHistorial] Ordenando ${articulosGuardados.length} artículos por fecha (descendente).`);
    // Sort by date, newest first. Handle potentially invalid dates.
    articulosGuardados.sort((a, b) => {
        const dateA = new Date(a.fecha);
        const dateB = new Date(b.fecha);
        if (isNaN(dateA) && isNaN(dateB)) return 0;
        if (isNaN(dateA)) return 1; // Invalid dates go to the end
        if (isNaN(dateB)) return -1;
        return dateB - dateA; // Sort descending
    });

    const formatCurrency = (value) => (typeof value === 'number' && isFinite(value))
        ? value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : 'N/A';

    console.log("[cargarHistorial] Generando filas de la tabla...");
    articulosGuardados.forEach((articulo, index) => {
        // console.log(`[cargarHistorial] Añadiendo fila ${index + 1}:`, articulo);
        const row = document.createElement('tr');
        // Add clickable class for styling and potential future use
        row.className = 'clickable-row';
        // Store the ID on the row for easy access
        row.dataset.id = articulo.id;

        // Generar HTML para la imagen (miniatura o placeholder)
        const fotoHtml = articulo.fotoDataUrl
            ? `<img src="${articulo.fotoDataUrl}" alt="Miniatura ${articulo.nombre || ''}" class="historial-foto-miniatura">`
            : '<span class="text-xs text-gray-400">Sin foto</span>'; // Placeholder si no hay imagen

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${articulo.fecha || 'Sin fecha'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${articulo.nombre || 'Sin nombre'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${articulo.cliente || 'Sin cliente'}</td>
            <td class="px-2 py-2 whitespace-nowrap text-sm text-gray-500 align-middle text-center">${fotoHtml}</td> <!-- Celda Foto -->
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">$ ${formatCurrency(articulo.costoTotal)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right font-semibold">$ ${formatCurrency(articulo.precioFinal)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-right space-x-2">
                <button class="edit-button-icon" title="Editar Artículo">
                    <i class="lucide">Editar</i> <!-- Using Lucide font class -->
                </button>
                <button class="delete-button-text" title="Eliminar Artículo">
                    Eliminar
                </button>
            </td>
        `;

        // Add event listeners directly to buttons within the row
        const editButton = row.querySelector('.edit-button-icon');
        const deleteButton = row.querySelector('.delete-button-text');

        editButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent row click if button is clicked
            console.log(`[Click Editar] ID: ${articulo.id}`);
            cargarArticuloParaEditar(articulo.id);
        });

        deleteButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent row click if button is clicked
            console.log(`[Click Eliminar] ID: ${articulo.id}`);
            eliminarArticulo(articulo.id);
        });

         // Add listener to the row itself (optional, e.g., for quick view/edit)
         row.addEventListener('click', () => {
             console.log(`[Click Fila] Cargando artículo con ID: ${articulo.id}`);
             cargarArticuloParaEditar(articulo.id);
         });

        historialBody.appendChild(row);
    });
    console.log("[cargarHistorial] Historial cargado y tabla actualizada.");
}

// Cargar un artículo guardado en el formulario para editarlo
function cargarArticuloParaEditar(id) {
    console.log(`[cargarArticuloParaEditar] Intentando cargar artículo con ID: ${id}`);
    const articulosGuardados = getArticulosFromStorage();
    const articulo = articulosGuardados.find(a => a.id === id);

    if (!articulo) {
        console.error(`[cargarArticuloParaEditar] No se encontró artículo con ID: ${id}`);
        showSnackbar('Error: No se encontró el artículo para editar.', 'error');
        return;
    }
    console.log("[cargarArticuloParaEditar] Artículo encontrado:", articulo);

    // Manually reset form fields before populating
    console.log("[cargarArticuloParaEditar] Limpiando formulario antes de cargar datos...");
    form.reset(); // Resets basic fields
    componentesCostoDiv.innerHTML = ''; // Clear components
    clearImagePreview(); // Asegura que la imagen previa esté limpia

    // Populate form fields
    console.log("[cargarArticuloParaEditar] Llenando campos del formulario...");
    nombreArticuloInput.value = articulo.nombre || '';
    clienteInput.value = articulo.cliente || '';
    fechaInput.value = articulo.fecha || '';
    caracteristicasInput.value = articulo.caracteristicas || '';
    markupInput.value = articulo.markup || 1.8; // Use stored markup or default

    // Re-add components from the loaded article
    console.log("[cargarArticuloParaEditar] Añadiendo componentes...");
    if (articulo.componentes && Array.isArray(articulo.componentes) && articulo.componentes.length > 0) {
        articulo.componentes.forEach(comp => agregarComponente(comp.nombre, comp.costo, comp.subcomponentes));
    } else {
        console.log("[cargarArticuloParaEditar] No hay componentes guardados, añadiendo uno vacío.");
        agregarComponente(); // Add an empty one if none exist
    }

    // Cargar imagen si existe
    if (articulo.fotoDataUrl) {
        console.log("[cargarArticuloParaEditar] Cargando imagen desde Data URL guardado.");
        fotoPreview.src = articulo.fotoDataUrl;
        fotoPreview.style.display = 'block';
        fotoPlaceholder.style.display = 'none';
        fotoPreviewContainer.style.display = 'flex';
        clearFotoBtn.style.display = 'inline-block';
    } else {
        console.log("[cargarArticuloParaEditar] No hay imagen guardada para este artículo.");
        // La previsualización ya fue limpiada por clearImagePreview()
    }

    console.log("[cargarArticuloParaEditar] Recalculando costos y precio...");
    calcularCostos(); // Recalculate totals based on loaded data

    // Set editing state
    console.log(`[cargarArticuloParaEditar] Estableciendo currentEditingId a: ${id}`);
    currentEditingId = id; // Store the ID of the item being edited
    // Change button text and style to indicate update mode
    guardarBtn.textContent = 'Actualizar Artículo';
    guardarBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
    guardarBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');

    showSnackbar(`Artículo "${articulo.nombre}" cargado para editar.`, 'info');
    // Scroll to top for better UX after loading
    window.scrollTo({ top: 0, behavior: 'smooth' });
    console.log("[cargarArticuloParaEditar] Carga para edición completada.");
}

// Eliminar un artículo del historial
function eliminarArticulo(id) {
    console.log(`[eliminarArticulo] Intentando eliminar artículo con ID: ${id}`);
    // Confirmation dialog
    if (!confirm('¿Estás seguro de que quieres eliminar este artículo? Esta acción no se puede deshacer.')) {
        console.log("[eliminarArticulo] Eliminación cancelada por el usuario.");
        return; // Stop if user cancels
    }

    let articulosGuardados = getArticulosFromStorage();
    const articuloAEliminarNombre = articulosGuardados.find(a => a.id === id)?.nombre || 'seleccionado'; // Get name for notification
    const originalLength = articulosGuardados.length;

    // Filter out the article with the matching ID
    articulosGuardados = articulosGuardados.filter(a => a.id !== id);
    const newLength = articulosGuardados.length;
    console.log(`[eliminarArticulo] Lista filtrada. Longitud original: ${originalLength}, nueva longitud: ${newLength}`);

    // Save the modified list back to storage
    if (saveArticulosToStorage(articulosGuardados)) {
        showSnackbar(`Artículo "${articuloAEliminarNombre}" eliminado.`, 'success');
        console.log("[eliminarArticulo] Llamando a cargarHistorial().");
        cargarHistorial(); // Refresh the history table

        // If the deleted item was the one currently being edited, clear the form
        if (currentEditingId === id) {
            console.log("[eliminarArticulo] El artículo eliminado era el que se estaba editando. Llamando a limpiarFormulario().");
            limpiarFormulario();
        }
    } else {
         console.error("[eliminarArticulo] Falló saveArticulosToStorage.");
         // Error snackbar should have been shown by saveArticulosToStorage
    }
    console.log("[eliminarArticulo] Proceso de eliminación finalizado.");
}

// Modificar la función filtrarHistorial
function filtrarHistorial(busqueda) {
    const articulosGuardados = getArticulosFromStorage();
    const busquedaLower = busqueda.toLowerCase();
    
    const articulosFiltrados = articulosGuardados.filter(articulo => 
        articulo.nombre.toLowerCase().includes(busquedaLower)
    );

    // Limpiar y actualizar la tabla con los resultados filtrados
    historialBody.innerHTML = '';
    
    if (articulosFiltrados.length === 0) {
        historialBody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">No se encontraron artículos.</td></tr>';
        return;
    }

    // Ordenar por fecha
    articulosFiltrados.sort((a, b) => {
        const dateA = new Date(a.fecha);
        const dateB = new Date(b.fecha);
        if (isNaN(dateA) && isNaN(dateB)) return 0;
        if (isNaN(dateA)) return 1;
        if (isNaN(dateB)) return -1;
        return dateB - dateA;
    });

    const formatCurrency = (value) => (typeof value === 'number' && isFinite(value))
        ? value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : 'N/A';

    // Generar filas para los artículos filtrados
    articulosFiltrados.forEach(articulo => {
        const row = document.createElement('tr');
        row.className = 'clickable-row';
        row.dataset.id = articulo.id;

        // Generar HTML para la imagen
        const fotoHtml = articulo.fotoDataUrl
            ? `<img src="${articulo.fotoDataUrl}" alt="Miniatura ${articulo.nombre || ''}" class="historial-foto-miniatura">`
            : '<span class="text-xs text-gray-400">Sin foto</span>';

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${articulo.fecha || 'Sin fecha'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${articulo.nombre || 'Sin nombre'}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${articulo.cliente || 'Sin cliente'}</td>
            <td class="px-2 py-2 whitespace-nowrap text-sm text-gray-500 align-middle text-center">${fotoHtml}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">$ ${formatCurrency(articulo.costoTotal)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right font-semibold">$ ${formatCurrency(articulo.precioFinal)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-right space-x-2">
                <button class="edit-button-icon" title="Editar Artículo">
                    <i class="lucide">Editar</i>
                </button>
                <button class="delete-button-text" title="Eliminar Artículo">
                    Eliminar
                </button>
            </td>
        `;

        // Agregar event listeners
        const editButton = row.querySelector('.edit-button-icon');
        const deleteButton = row.querySelector('.delete-button-text');

        editButton.addEventListener('click', (event) => {
            event.stopPropagation();
            cargarArticuloParaEditar(articulo.id);
        });

        deleteButton.addEventListener('click', (event) => {
            event.stopPropagation();
            eliminarArticulo(articulo.id);
        });

        row.addEventListener('click', () => {
            cargarArticuloParaEditar(articulo.id);
        });

        historialBody.appendChild(row);
    });
}

// Agregar listener para la búsqueda
buscarArticuloInput.addEventListener('input', (e) => {
    filtrarHistorial(e.target.value);
});

// --- Event Listeners ---
addComponenteBtn.addEventListener('click', () => agregarComponente());
calcularBtn.addEventListener('click', calcularCostos);
form.addEventListener('submit', guardarArticulo);
limpiarBtn.addEventListener('click', limpiarFormulario);
fotoInput.addEventListener('change', handleFotoSelection); // Listener para el input de foto
clearFotoBtn.addEventListener('click', clearImagePreview); // Listener para limpiar la foto

// Add input listeners to markup for real-time price update
markupInput.addEventListener('input', calcularCostos);
markupInput.addEventListener('blur', calcularCostos);

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("[DOMContentLoaded] Página cargada. Iniciando aplicación...");

    // Check if localStorage is available and usable
    let localStorageAvailable = false;
    try {
        localStorage.setItem('__test__', 'test');
        localStorage.removeItem('__test__');
        localStorageAvailable = true;
        console.log("[DOMContentLoaded] localStorage está disponible y funciona.");
    } catch (e) {
        console.error("[DOMContentLoaded] localStorage NO está disponible o está deshabilitado!", e);
        showSnackbar("Advertencia: El almacenamiento local no está disponible. No se podrán guardar ni cargar artículos.", "error");
        // Optionally disable save/load features if localStorage is crucial
        guardarBtn.disabled = true;
        limpiarBtn.disabled = true; // Or adjust functionality
    }

    // Set current date in the date input (with fallback)
     try {
        fechaInput.valueAsDate = new Date();
    } catch (e) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        fechaInput.value = `${yyyy}-${mm}-${dd}`;
    }

    // Initial setup
    agregarComponente(); // Add the first empty component row

    // Load history only if storage is available
    if (localStorageAvailable) {
        cargarHistorial();
    } else {
        historialBody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">El almacenamiento local no está disponible. No se puede cargar el historial.</td></tr>'; // Colspan aumentado a 7
    }

    console.log("[DOMContentLoaded] Inicialización completada.");
});