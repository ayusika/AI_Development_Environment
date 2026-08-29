// WRITER:VIEW_REGISTRY:START

const views = {
  home: document.querySelector('[data-view="home"]'),
  diary: document.querySelector('[data-view="diary"]'),
  nukinaviCreate: document.querySelector('[data-view="nukinavi-create"]'),
  heavenCreate: document.querySelector('[data-view="heaven-create"]'),
  diaryEdit: document.querySelector('[data-view="diary-edit"]'),
  postPrep: document.querySelector('[data-view="post-prep"]'),
  schedule: document.querySelector('[data-view="schedule"]'),
  shift: document.querySelector('[data-view="shift"]'),
  customers: document.querySelector('[data-view="customers"]'),
  customerDetail: document.querySelector('[data-view="customer-detail"]'),
  database: document.querySelector('[data-view="database"]'),
  placeholder: document.querySelector('[data-view="placeholder"]'),
};

// WRITER:VIEW_REGISTRY:END

const navItems = document.querySelectorAll('.nav-item');


const placeholderTitle = document.getElementById('placeholder-title');


function showView(viewName) {
  Object.values(views).forEach((view) => {
    if (!view) return;
    view.classList.remove('is-active');
  });

  const target = views[viewName];

  if (!target) {
    console.warn(`View not found: ${viewName}`);
    return;
  }

  target.classList.add('is-active');

  updateBottomNav(viewName);

  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  });
}


function updateBottomNav(viewName) {
  navItems.forEach((item) => {
    item.classList.remove('is-active');
  });

  let activeNav = 'home';

  if (
    viewName === 'diary' ||
    viewName === 'nukinaviCreate' ||
    viewName === 'diaryEdit' ||
    viewName === 'postPrep'
  ) {
    activeNav = 'diary';
  }

  if (
    viewName === 'schedule'
    || viewName === 'heavenCreate'
  ) {
    activeNav = 'schedule';
  }

  if (viewName === 'shift') {
    activeNav = 'shift';
  }

  if (
    viewName === 'customers'
    || viewName === 'customerDetail'
  ) {
    activeNav = 'customers';
  }

  const activeItem = document.querySelector(
    `.nav-item[data-nav="${activeNav}"]`
  );

  if (activeItem) {
    activeItem.classList.add('is-active');
  }
}

// WRITER:MAIN_NAV_ROUTING:START

function handleNav(navName) {
  if (navName === 'home') {
    showView('home');
    return;
  }

  if (navName === 'diary') {
    showView('diary');
    return;
  }

  if (navName === 'schedule') {
    showView('schedule');
    loadSchedule();
    return;
  }

  if (navName === 'shift') {
    showView('shift');
    loadShift();
    return;
  }

  if (navName === 'customers') {
    showView('customers');
    loadCustomers();
    return;
  }

  const labels = {
    sales: '売上',
    koppy: 'Koppy',
  };

  showPlaceholder(
    labels[navName] || '準備中',
    navName
  );
}

// WRITER:MAIN_NAV_ROUTING:END

/* ========================================
   PLACEHOLDER
======================================== */

function showPlaceholder(
  title,
  navName = null
) {
  if (placeholderTitle) {
    placeholderTitle.textContent =
      title;
  }

  showView('placeholder');

  navItems.forEach((item) => {
    item.classList.remove('is-active');
  });

  if (navName) {
    const activeItem =
      document.querySelector(
        `.nav-item[data-nav="${navName}"]`
      );

    if (activeItem) {
      activeItem.classList.add('is-active');
    }
  }
}
