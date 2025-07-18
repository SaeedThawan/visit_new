// Google Apps Script Web App URL (REPLACE THIS WITH YOUR DEPLOYED WEB APP URL)
const GOOGLE_SHEETS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxEVsrI0WIDAJvvhZwMMnUC3MzPHJ9rlm3SuzClCemhLSok4IrOyHDiz7Gb6eSXqdaecQ/exec';

// Global variables to store fetched data
let productsData = [];
let salesRepresentatives = [];
let customersMain = [];
let visitOutcomes = [];
let visitPurposes = [];
let visitTypes = [];

// Get DOM elements
const visitForm = document.getElementById('visitForm');
const salesRepNameSelect = document.getElementById('salesRepName');
const customerNameInput = document.getElementById('customerName');
const customerListDatalist = document.getElementById('customerList');
const visitTypeSelect = document.getElementById('visitType');
const visitPurposeSelect = document.getElementById('visitPurpose');
const visitOutcomeSelect = document.getElementById('visitOutcome');
const productCategoriesDiv = document.getElementById('productCategories');
const productsDisplayDiv = document.getElementById('productsDisplay');
const submitBtn = document.getElementById('submitBtn');
const loadingSpinner = document.getElementById('loadingSpinner');
const messageBox = document.getElementById('messageBox');
const messageText = document.getElementById('messageText');

// --- Helper Functions ---

/**
 * Displays a custom message box.
 * @param {string} message - The message to display.
 * @param {boolean} isError - True if it's an error message, false for success.
 */
function showMessageBox(message, isError = false) {
    messageText.textContent = message;
    messageBox.classList.remove('hidden', 'error');
    messageBox.classList.add('opacity-0'); // Start hidden for transition
    if (isError) {
        messageBox.classList.add('error');
    } else {
        messageBox.classList.remove('error');
    }
    // Force reflow for transition
    void messageBox.offsetWidth;
    messageBox.classList.remove('opacity-0');
    messageBox.classList.add('opacity-100');

    setTimeout(() => {
        messageBox.classList.remove('opacity-100');
        messageBox.classList.add('opacity-0');
        setTimeout(() => {
            messageBox.classList.add('hidden');
        }, 300); // Wait for fade out transition
    }, 5000); // Message visible for 5 seconds
}

/**
 * Generates a unique Visit ID.
 * @returns {string} A unique ID.
 */
function generateVisitID() {
    const timestamp = new Date().getTime();
    const randomString = Math.random().toString(36).substring(2, 8); // 6 random chars
    return `VISIT-${timestamp}-${randomString}`;
}

/**
 * Formats a date object to a localized date string (ar-SA).
 * @param {Date} date - The date object.
 * @returns {string} Formatted date string.
 */
function formatDate(date) {
    return date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Formats a date object to a localized time string (ar-SA).
 * @param {Date} date - The date object.
 * @returns {string} Formatted time string.
 */
function formatTime(date) {
    return date.toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false // 24-hour format
    });
}

/**
 * Formats a date object to a localized timestamp string (ar-SA).
 * @param {Date} date - The date object.
 * @returns {string} Formatted timestamp string.
 */
function formatTimestamp(date) {
    return date.toLocaleString('ar-SA', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false // 24-hour format
    });
}

// --- Data Fetching Functions ---

/**
 * Fetches JSON data from a given URL.
 * @param {string} url - The URL of the JSON file.
 * @returns {Promise<Array|Object>} - A promise that resolves with the JSON data.
 */
async function fetchJsonData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} from ${url}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Could not fetch data from ${url}:`, error);
        showMessageBox(`فشل تحميل البيانات من ${url}. يرجى التحقق من الملفات.`, true);
        return []; // Return empty array to prevent further errors
    }
}

/**
 * Loads all necessary JSON data.
 */
async function loadAllData() {
    [
        productsData,
        salesRepresentatives,
        customersMain,
        visitOutcomes,
        visitPurposes,
        visitTypes
    ] = await Promise.all([
        fetchJsonData('products.json'),
        fetchJsonData('sales_representatives.json'),
        fetchJsonData('customers_main.json'),
        fetchJsonData('visit_outcomes.json'),
        fetchJsonData('visit_purposes.json'),
        fetchJsonData('visit_types.json')
    ]);

    // Populate dropdowns and setup product categories after data is loaded
    populateSelect(salesRepNameSelect, salesRepresentatives);
    populateCustomerDatalist();
    populateSelect(visitTypeSelect, visitTypes, 'Visit_Type_Name_AR', 'Visit_Type_Name_AR');
    populateSelect(visitPurposeSelect, visitPurposes);
    populateSelect(visitOutcomeSelect, visitOutcomes);
    setupProductCategories();
}

// --- Form Population Functions ---

/**
 * Populates a select element with options from an array.
 * @param {HTMLSelectElement} selectElement - The select element to populate.
 * @param {Array<string|object>} dataArray - The array of data.
 * @param {string} [valueKey] - The key for the option's value if dataArray contains objects.
 * @param {string} [textKey] - The key for the option's text if dataArray contains objects.
 */
function populateSelect(selectElement, dataArray, valueKey, textKey) {
    // Clear existing options first, except the default "اختر..." option
    while (selectElement.children.length > 1) {
        selectElement.removeChild(selectElement.lastChild);
    }
    dataArray.forEach(item => {
        const option = document.createElement('option');
        if (typeof item === 'object' && item !== null) {
            option.value = item[valueKey];
            option.textContent = item[textKey];
        } else {
            option.value = item;
            option.textContent = item;
        }
        selectElement.appendChild(option);
    });
}

/**
 * Populates the datalist for customer names.
 */
function populateCustomerDatalist() {
    // Clear existing options first
    customerListDatalist.innerHTML = '';
    customersMain.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.Customer_Name_AR;
        customerListDatalist.appendChild(option);
    });
}

/**
 * Groups products by category and populates category checkboxes.
 */
let productCategories = {};
function setupProductCategories() {
    productCategoriesDiv.innerHTML = ''; // Clear existing categories
    productCategories = {}; // Reset product categories map

    productsData.forEach(product => {
        if (!productCategories[product.Category]) {
            productCategories[product.Category] = [];
        }
        productCategories[product.Category].push(product);
    });

    // Create checkboxes for each category
    for (const category in productCategories) {
        const div = document.createElement('div');
        div.className = 'flex items-center';
        div.innerHTML = `
            <input type="checkbox" id="cat-${category.replace(/\s/g, '-')}" name="productCategory" value="${category}"
                   class="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer">
            <label for="cat-${category.replace(/\s/g, '-')}" class="ml-2 block text-sm font-medium text-gray-700 cursor-pointer">
                ${category}
            </label>
        `;
        productCategoriesDiv.appendChild(div);

        // Add event listener to each checkbox
        div.querySelector('input[type="checkbox"]').addEventListener('change', (event) => {
            toggleProductsDisplay(event.target.value, event.target.checked);
        });
    }
}

/**
 * Toggles the display of products for a given category.
 * @param {string} category - The category name.
 * @param {boolean} isChecked - Whether the checkbox is checked.
 */
function toggleProductsDisplay(category, isChecked) {
    const categoryProducts = productCategories[category];
    if (!categoryProducts) return;

    if (isChecked) {
        // Display products for this category
        categoryProducts.forEach(product => {
            // Ensure unique ID for product element
            const safeProductName = product.Product_Name_AR.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, ''); // Allow Arabic characters
            const productId = `product-${safeProductName}-${Math.random().toString(36).substring(2, 6)}`;
            const productDiv = document.createElement('div');
            productDiv.id = productId;
            productDiv.className = 'product-item';
            productDiv.setAttribute('data-category', category); // Add data attribute for easier filtering
            productDiv.innerHTML = `
                <label>${product.Product_Name_AR}</label>
                <div class="radio-group">
                    <label class="inline-flex items-center">
                        <input type="radio" name="status-${productId}" value="متوفر" required class="form-radio text-green-600">
                        <span class="ml-2 text-gray-700">متوفر</span>
                    </label>
                    <label class="inline-flex items-center">
                        <input type="radio" name="status-${productId}" value="غير متوفر" required class="form-radio text-red-600">
                        <span class="ml-2 text-gray-700">غير متوفر</span>
                    </label>
                </div>
            `;
            productsDisplayDiv.appendChild(productDiv);
        });
    } else {
        // Remove products for this category
        const productsToRemove = productsDisplayDiv.querySelectorAll(`[data-category="${category}"]`);
        productsToRemove.forEach(productDiv => {
            productDiv.remove();
        });
    }
}

// --- Form Submission Logic ---

/**
 * Validates if all displayed products have a status selected.
 * @returns {boolean} True if all products are validated, false otherwise.
 */
function validateProductStatuses() {
    const displayedProducts = productsDisplayDiv.querySelectorAll('.product-item');
    if (displayedProducts.length === 0) {
        // If no product categories are selected, it's valid to submit without product data.
        return true;
    }

    let allProductsAnswered = true;
    displayedProducts.forEach(productDiv => {
        const productName = productDiv.querySelector('label').textContent;
        const radios = productDiv.querySelectorAll('input[type="radio"]');
        let isAnswered = false;
        radios.forEach(radio => {
            if (radio.checked) {
                isAnswered = true;
            }
        });
        if (!isAnswered) {
            allProductsAnswered = false;
            // Highlight the unanswered product for better UX
            productDiv.style.border = '2px solid #ef4444'; // Red border
            productDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => productDiv.style.border = '', 3000); // Remove highlight after 3 seconds
        } else {
            productDiv.style.border = ''; // Remove any previous highlight
        }
    });

    if (!allProductsAnswered) {
        showMessageBox('الرجاء تحديد حالة التوفر لكل المنتجات الظاهرة.', true);
    }
    return allProductsAnswered;
}

/**
 * Handles the form submission.
 * @param {Event} event - The form submit event.
 */
async function handleSubmit(event) {
    event.preventDefault(); // Prevent default form submission

    // Basic form validation (HTML5 'required' attribute handles most)
    if (!visitForm.checkValidity()) {
        visitForm.reportValidity(); // Show browser's validation messages
        showMessageBox('الرجاء تعبئة جميع الحقول المطلوبة.', true);
        return;
    }

    // Validate product statuses
    if (!validateProductStatuses()) {
        return;
    }

    // Show loading spinner and disable button
    submitBtn.disabled = true;
    loadingSpinner.classList.remove('hidden');

    const formData = new FormData(visitForm);
    const now = new Date();

    // Collect data for Google Sheets
    const dataToSubmit = {
        Visit_ID: generateVisitID(),
        Customer_Name_AR: formData.get('Customer_Name_AR'),
        Sales_Rep_Name_AR: formData.get('Sales_Rep_Name_AR'),
        Visit_Date: formatDate(now),
        Visit_Time: formatTime(now),
        Visit_Purpose: formData.get('Visit_Purpose'),
        Visit_Outcome: formData.get('Visit_Outcome'),
        Visit_Type_Name_AR: formData.get('Visit_Type_Name_AR'),
        Entry_User_Name: formData.get('Entry_User_Name'),
        Timestamp: formatTimestamp(now),
        Customer_Type: formData.get('Customer_Type'),
        Notes: formData.get('Notes') || '' // Ensure notes is not null
    };

    // Process product availability
    const availableProducts = [];
    const unavailableProducts = [];
    // Get all currently displayed products, not just selected categories
    const displayedProducts = productsDisplayDiv.querySelectorAll('.product-item');

    displayedProducts.forEach(productDiv => {
        const productName = productDiv.querySelector('label').textContent;
        const selectedStatus = productDiv.querySelector('input[type="radio"]:checked');
        if (selectedStatus) {
            if (selectedStatus.value === 'متوفر') {
                availableProducts.push(productName);
            } else if (selectedStatus.value === 'غير متوفر') {
                unavailableProducts.push(productName);
            }
        }
    });

    dataToSubmit.Available_Products_Names = availableProducts.join(', ');
    dataToSubmit.Unavailable_Products_Names = unavailableProducts.join(', ');

    console.log('Data to submit:', dataToSubmit); // For debugging

    try {
        const response = await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors', // Required for Google Apps Script Web App
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataToSubmit),
        });

        // Since mode is 'no-cors', we can't directly check response.ok or response.json()
        // We assume success if no network error occurs.
        // The actual success/failure will be confirmed by checking Google Sheet.
        showMessageBox('تم إرسال البيانات بنجاح! يرجى التحقق من Google Sheets.');
        visitForm.reset(); // Clear form after successful submission
        productsDisplayDiv.innerHTML = ''; // Clear displayed products
        // Uncheck all category checkboxes
        document.querySelectorAll('input[name="productCategory"]:checked').forEach(checkbox => {
            checkbox.checked = false;
        });

    } catch (error) {
        console.error('Error submitting data:', error);
        showMessageBox('حدث خطأ أثناء إرسال البيانات. يرجى المحاولة مرة أخرى.', true);
    } finally {
        // Re-enable button and hide spinner
        submitBtn.disabled = false;
        loadingSpinner.classList.add('hidden');
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadAllData(); // Load all JSON data first
    // Add form submit listener
    visitForm.addEventListener('submit', handleSubmit);
});
