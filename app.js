// ==========================================
// SWEET CRUSH GOLD - Core Web App Logic
// ==========================================

// Global state variables
let productsData = [];
let selectedProducts = {}; // Map of productId -> quantity
let currentSlide = 0;
let phoneNumber = "923008536213";
const totalSlides = 4;
let slideInterval;
let filtersReady = false;

function getAppReferenceUrl() {
  if (window.location.protocol === "file:") {
    return window.location.href.replace(/index\.html?$/i, "").replace(/[#?].*$/, "");
  }

  return window.location.origin;
}

document.addEventListener("DOMContentLoaded", () => {
  initMobileNav();
  initCatalogueSlider();
  fetchProducts();
  initQuotationCart();
  initDownloadCenter();
  initTestimonials();
  initStatsCounter();
  initScrollReveal();
});

// ==========================================
// Mobile Navigation Toggle
// ==========================================
function initMobileNav() {
  const mobileToggle = document.getElementById("mobileToggle");
  const navMenu = document.getElementById("navMenu");
  const navLinks = document.querySelectorAll(".nav-item a");

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener("click", () => {
      navMenu.classList.toggle("active");
      mobileToggle.classList.toggle("open");

      // Animate hamburger to X
      const spans = mobileToggle.querySelectorAll("span");
      if (navMenu.classList.contains("active")) {
        spans[0].style.transform = "rotate(45deg) translate(6px, 6px)";
        spans[1].style.opacity = "0";
        spans[2].style.transform = "rotate(-45deg) translate(6px, -6px)";
      } else {
        spans[0].style.transform = "none";
        spans[1].style.opacity = "1";
        spans[2].style.transform = "none";
      }
    });

    // Close menu when link is clicked
    navLinks.forEach(link => {
      link.addEventListener("click", () => {
        navMenu.classList.remove("active");
        const spans = mobileToggle.querySelectorAll("span");
        spans[0].style.transform = "none";
        spans[1].style.opacity = "1";
        spans[2].style.transform = "none";
      });
    });
  }
}

// ==========================================
// Catalogue Slider Carousel
// ==========================================
function initCatalogueSlider() {
  const wrapper = document.getElementById("sliderWrapper");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const dots = document.querySelectorAll("#sliderDots .dot");

  if (!wrapper || !prevBtn || !nextBtn) return;

  function updateSlider() {
    wrapper.style.transform = `translateX(-${currentSlide * 100}%)`;
    // Update dots
    dots.forEach((dot, index) => {
      dot.classList.toggle("active", index === currentSlide);
    });
  }

  function nextSlide() {
    currentSlide = (currentSlide + 1) % totalSlides;
    updateSlider();
  }

  function prevSlide() {
    currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
    updateSlider();
  }

  nextBtn.addEventListener("click", () => {
    nextSlide();
    resetSlideTimer();
  });

  prevBtn.addEventListener("click", () => {
    prevSlide();
    resetSlideTimer();
  });

  // Dot clicks
  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      currentSlide = index;
      updateSlider();
      resetSlideTimer();
    });
  });

  // Auto transition every 5 seconds
  function startSlideTimer() {
    slideInterval = setInterval(nextSlide, 5000);
  }

  function resetSlideTimer() {
    clearInterval(slideInterval);
    startSlideTimer();
  }

  startSlideTimer();
}

// ==========================================
// Fetch & Render Products
// ==========================================
function fetchProducts() {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  const embeddedProducts = Array.isArray(window.SWEET_CRUSH_PRODUCTS) ? window.SWEET_CRUSH_PRODUCTS : [];

  // Render immediately from embedded data if available (no waiting for fetch)
  if (embeddedProducts.length > 0) {
    productsData = embeddedProducts;
    renderProducts(productsData);
    setupFilters();
  } else {
    // No embedded data — show skeleton while fetching
    grid.innerHTML = Array(6).fill(0).map(() => `
      <div class="product-card" style="opacity: 0.6; pointer-events: none;">
        <div class="product-image-container" style="background: #F3F4F6;"></div>
        <div class="product-details">
          <div style="height: 24px; background: #E5E7EB; margin-bottom: 12px; border-radius: 4px;"></div>
          <div style="height: 16px; background: #E5E7EB; width: 60%; margin-bottom: 20px; border-radius: 4px;"></div>
          <div style="height: 48px; background: #E5E7EB; border-radius: 4px;"></div>
        </div>
      </div>
    `).join('');
  }

  // Background fetch for latest data (skip on file:// protocol)
  if (window.location.protocol === "file:") return;

  fetch("./products.json", { cache: "no-store" })
    .then(response => response.json())
    .then(data => {
      productsData = data;
      reapplyCurrentFilter();
    })
    .catch(error => {
      console.error("Background fetch failed, using embedded data:", error);
    });
}

function renderProducts(products) {
  const grid = document.getElementById("productsGrid");
  if (!grid) return;

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="no-results">
        <h3>No products found</h3>
        <p>Try adjusting your search terms or filters.</p>
      </div>
    `;
    return;
  }

  const visibleProducts = products.filter(p => p.image);
  if (visibleProducts.length === 0) {
    grid.innerHTML = `
      <div class="no-results">
        <h3>No products with images available</h3>
        <p>Product images are being updated. Check back soon.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = visibleProducts.map(product => {
    const isChecked = selectedProducts[product.id] !== undefined;
    const catClass = getCategoryClass(product.category);

    // URL encode spaces in product image name
    const imageUrl = `assets/products/${encodeURIComponent(product.image)}`;

    return `
      <div class="product-card" data-id="${product.id}">
        <!-- Checkbox Selection -->
        <div class="card-select-overlay">
          <label class="custom-checkbox">
            <input type="checkbox" class="product-checkbox" data-id="${product.id}" ${isChecked ? 'checked' : ''}>
            <span class="checkmark"></span>
          </label>
        </div>
        
        <!-- Category Badge -->
        <div class="card-badge-overlay">
          <span class="category-badge ${catClass}">${product.category}</span>
        </div>

        <!-- Product Image -->
        <div class="product-image-container">
          <img src="${imageUrl}" alt="${product.name}" onerror="this.src='https://placehold.co/300x200?text=${encodeURIComponent(product.name)}';">
        </div>

        <!-- Details -->
        <div class="product-details">
          <h3 class="product-name">${product.name}</h3>
          
          <div class="product-packing">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
            </svg>
            <span>Packing: ${product.packing}</span>
          </div>

          <div class="pricing-container">
            <div class="price-item trade-price">
              <span class="price-label">Trade Price</span>
              <span class="price-val">Rs. ${product.tradePrice}</span>
            </div>
            <div class="price-item retail-price">
              <span class="price-label">Retail Price</span>
              <span class="price-val">Rs. ${product.retailPrice}</span>
            </div>
          </div>

          <div class="card-actions">
            <button class="btn-share share-single-whatsapp" data-id="${product.id}">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.333 4.982L2 22l5.233-1.371a9.994 9.994 0 0 0 4.779 1.203h.005c5.505 0 9.988-4.479 9.989-9.985a9.98 9.98 0 0 0-9.994-9.847zm4.992 14.129c-.274.767-1.344 1.396-1.859 1.488-.475.086-.948.337-3.046-.488-2.687-1.054-4.407-3.791-4.542-3.97-.133-.18-1.09-1.448-1.09-2.763 0-1.314.686-1.96.932-2.227.246-.267.535-.333.713-.333.178 0 .356.006.512.013.16.007.373-.06.584.453.214.52.733 1.786.797 1.92.062.133.104.288.016.467-.088.177-.133.289-.266.444-.133.156-.279.346-.399.466-.134.133-.274.28-.119.546.156.266.691 1.139 1.483 1.848.986.883 1.815 1.156 2.072 1.285.257.13.408.11.56-.062.152-.172.651-.756.825-1.012.174-.257.348-.21.587-.123.24.086 1.516.715 1.776.845.26.13.433.195.498.307.065.11.065.642-.209 1.411z"></path>
              </svg>
              Share Product
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Bind checkbox events
  document.querySelectorAll(".product-checkbox").forEach(cb => {
    cb.addEventListener("change", (e) => {
      const pId = parseInt(e.target.dataset.id);
      if (e.target.checked) {
        selectedProducts[pId] = 1; // Default quantity is 1
      } else {
        delete selectedProducts[pId];
      }
      updateQuotationDrawer();
    });
  });

  // Bind individual share buttons
  document.querySelectorAll(".share-single-whatsapp").forEach(btn => {
    btn.addEventListener("click", () => {
      const pId = parseInt(btn.dataset.id);
      shareSingleProduct(pId);
    });
  });
}

function getCategoryClass(cat) {
  switch (cat) {
    case "Candy": return "cat-candy";
    case "Lollipop": return "cat-lollipop";
    case "Toffee": return "cat-toffee";
    case "Jelly": return "cat-jelly";
    case "Bunties": return "cat-bunties";
    case "Liquid Chocolate": return "cat-liquid-chocolate";
    case "Chocolate Cone": return "cat-chocolate-cone";
    case "Hard Chocolate": return "cat-hard-chocolate";
    case "Imli": return "cat-imli";
    case "Bubble": return "cat-bubble";
    case "Others": return "cat-others";
    default: return "cat-others";
  }
}

// ==========================================
// Product Search & Category Filters
// ==========================================
let currentSearch = "";
let currentCategory = "All";

function applyFilters() {
  const filtered = productsData.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(currentSearch.toLowerCase());
    const matchesCat = currentCategory === "All" || product.category === currentCategory;
    return matchesSearch && matchesCat;
  });
  renderProducts(filtered);
}

function reapplyCurrentFilter() {
  applyFilters();
}

function setupFilters() {
  if (filtersReady) return;
  filtersReady = true;

  const searchInput = document.getElementById("searchInput");
  const filterTabs = document.querySelectorAll(".filter-tab");

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearch = e.target.value;
      applyFilters();
    });
  }

  filterTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      filterTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentCategory = tab.dataset.category;
      applyFilters();
    });
  });
}

// ==========================================
// WhatsApp Quotation Logic
// ==========================================
function initQuotationCart() {
  const clearBtn = document.getElementById("clearBtn");
  const reviewBtn = document.getElementById("reviewBtn");
  const modalClose = document.getElementById("modalClose");
  const modalCancelBtn = document.getElementById("modalCancelBtn");
  const modalSendBtn = document.getElementById("modalSendBtn");
  const modalOverlay = document.getElementById("modalOverlay");

  // Bottom drawer buttons
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      selectedProducts = {};
      // Uncheck all checkboxes
      document.querySelectorAll(".product-checkbox").forEach(cb => {
        cb.checked = false;
      });
      updateQuotationDrawer();
    });
  }

  if (reviewBtn) {
    reviewBtn.addEventListener("click", () => {
      openQuotationModal();
    });
  }

  // Modal close buttons
  const closeModalHandler = () => {
    if (modalOverlay) modalOverlay.classList.remove("active");
  };

  if (modalClose) modalClose.addEventListener("click", closeModalHandler);
  if (modalCancelBtn) modalCancelBtn.addEventListener("click", closeModalHandler);
  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) closeModalHandler();
    });
  }

  // Modal Share send
  if (modalSendBtn) {
    modalSendBtn.addEventListener("click", () => {
      sendQuotationWhatsApp();
    });
  }
}

function updateQuotationDrawer() {
  const drawer = document.getElementById("quotationDrawer");
  const badge = document.getElementById("selectedCount");
  const desc = document.getElementById("drawerSummaryText");

  if (!drawer || !badge || !desc) return;

  const count = Object.keys(selectedProducts).length;
  badge.textContent = count;

  if (count > 0) {
    drawer.classList.add("active");
    desc.textContent = `You have selected ${count} items. Click Review & Share to specify client name and order quantity.`;
  } else {
    drawer.classList.remove("active");
    desc.textContent = "Select products above using checkboxes to start compiling a rate quote.";
  }
}

function openQuotationModal() {
  const modalOverlay = document.getElementById("modalOverlay");
  const listContainer = document.getElementById("modalItemsList");

  if (!modalOverlay || !listContainer) return;

  const selectedIds = Object.keys(selectedProducts);
  if (selectedIds.length === 0) return;

  // Build the list rows
  listContainer.innerHTML = selectedIds.map(idStr => {
    const id = parseInt(idStr);
    const product = productsData.find(p => p.id === id);
    if (!product) return '';

    const qty = selectedProducts[id];
    return `
      <div class="list-item-row" data-id="${product.id}">
        <div class="item-info">
          <span class="item-name">${product.name}</span>
          <span class="item-packing-price">Packing: ${product.packing} | TP: Rs. ${product.tradePrice}</span>
        </div>
        <div class="item-qty-selector">
          <button class="item-qty-btn qty-minus" data-id="${product.id}">-</button>
          <span class="qty-val" id="qty-val-${product.id}">${qty}</span>
          <button class="item-qty-btn qty-plus" data-id="${product.id}">+</button>
        </div>
      </div>
    `;
  }).join('');

  // Bind plus/minus button handlers inside modal
  listContainer.querySelectorAll(".qty-minus").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.dataset.id);
      if (selectedProducts[id] > 1) {
        selectedProducts[id]--;
        document.getElementById(`qty-val-${id}`).textContent = selectedProducts[id];
      }
    });
  });

  listContainer.querySelectorAll(".qty-plus").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.dataset.id);
      selectedProducts[id]++;
      document.getElementById(`qty-val-${id}`).textContent = selectedProducts[id];
    });
  });

  modalOverlay.classList.add("active");
}

function sendQuotationWhatsApp() {
  const clientNameInput = document.getElementById("clientName");
  const clientName = clientNameInput ? clientNameInput.value.trim() : "";
  const selectedIds = Object.keys(selectedProducts);

  if (selectedIds.length === 0) return;

  let messageText = `*Sweet Crush Gold - Price Quotation*\n`;
  messageText += `-----------------------------------------\n`;
  if (clientName) {
    messageText += `Customer: *${clientName}*\n`;
  }
  const dateStr = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  messageText += `Date: *${dateStr}*\n`;
  messageText += `-----------------------------------------\n`;
  messageText += `Here is the trade price list of selected items:\n\n`;

  let idx = 1;
  let totalEstimate = 0;

  selectedIds.forEach(idStr => {
    const id = parseInt(idStr);
    const product = productsData.find(p => p.id === id);
    if (product) {
      const qty = selectedProducts[id];
      const subtotal = product.tradePrice * qty;
      totalEstimate += subtotal;

      messageText += `${idx}. *${product.name}*\n`;
      messageText += `   - Packing: ${product.packing}\n`;
      messageText += `   - Price: Rs. ${product.tradePrice} (TP)\n`;
      messageText += `   - Qty: ${qty}\n`;
      messageText += `   - Subtotal: *Rs. ${subtotal.toLocaleString()}*\n\n`;
      idx++;
    }
  });

  messageText += `-----------------------------------------\n`;
  messageText += `*Total Estimated Amount:* *Rs. ${totalEstimate.toLocaleString()}*\n`;
  messageText += `_(Note: Prices exclude tax, packing & delivery charges)_\n\n`;
  messageText += `For complete catalogs and rate updates, visit our portal:\n`;
  messageText += `${getAppReferenceUrl()}\n`;

  // Close modal
  document.getElementById("modalOverlay").classList.remove("active");

  // Send WhatsApp Link
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(messageText)}`;
  window.open(whatsappUrl, "_blank");
}

function shareSingleProduct(pId) {
  const product = productsData.find(p => p.id === pId);
  if (!product) return;

  let messageText = `*Sweet Crush Gold - Product Details*\n`;
  messageText += `-----------------------------------------\n`;
  messageText += `*${product.name}* (${product.category})\n\n`;
  messageText += `- *Packing:* ${product.packing}\n`;
  messageText += `- *Trade Price (TP):* Rs. ${product.tradePrice}\n`;
  messageText += `- *Retail Price (RP):* Rs. ${product.retailPrice}\n`;
  messageText += `- *Unit Price:* Rs. ${product.unitPrice}\n`;
  messageText += `-----------------------------------------\n`;

  // Image Link representation
  const imageUrl = `${getAppReferenceUrl()}/assets/products/${encodeURIComponent(product.image)}`;
  messageText += `View Image: ${imageUrl}\n\n`;
  messageText += `Download full rate list at: ${getAppReferenceUrl()}\n`;

  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(messageText)}`;
  window.open(whatsappUrl, "_blank");
}

// ==========================================
// Download Center Pages Download Trigger
// ==========================================
function initDownloadCenter() {
  const downloadBtn = document.getElementById("downloadCatalogueBtn");

  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      for (let i = 1; i <= 4; i++) {
        const link = document.createElement("a");
        link.href = `assets/catalogue/page-${i}.jpg`;
        link.download = `Sweet_Crush_Gold_Catalogue_Page_${i}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  }
}

// ==========================================
// Testimonial (static display — all cards visible)
// ==========================================
function initTestimonials() {
  // All cards are rendered side by side via CSS flex.
  // No carousel logic needed.
}

// ==========================================
// Stats Counter Animation
// ==========================================
function initStatsCounter() {
  const statNumbers = document.querySelectorAll(".stat-number[data-target]");

  if (statNumbers.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.target);
        const suffix = target === 100 ? "%" : "+";
        let current = 0;
        const increment = Math.max(1, Math.floor(target / 40));
        const interval = setInterval(() => {
          current += increment;
          if (current >= target) {
            current = target;
            clearInterval(interval);
          }
          el.textContent = current + suffix;
        }, 30);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  statNumbers.forEach((el) => observer.observe(el));
}

// ==========================================
// Scroll Reveal Animations
// ==========================================
function initScrollReveal() {
  const revealElements = document.querySelectorAll(
    ".about-grid, .features-grid, .catalogue-container, .banner-content, .search-filter-container, .products-grid, .download-cards-container, .testimonials-container, .cta-content, .stats-grid"
  );

  if (revealElements.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  revealElements.forEach((el) => {
    el.classList.add("reveal");
    observer.observe(el);
  });
}
