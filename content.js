const colors = {
  inaccessible: '#E5E5E5',
  0: '#CB81FD',
  1: '#1CB0F6',
  2: '#58CC02',
  3: '#FF4B4B',
  4: '#FF9600',
  complete: '#FFD900',
  legendary: '#A9A1FF'
};

const classPrefix = 'duolingo-progress-bar-';

function waitForElement(selector) {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver((mutations) => {
      if (document.querySelector(selector)) {
        resolve(document.querySelector(selector));
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
}

function Bar() {
  const bar = document.createElement('div');
  bar.id = 'duolingo-progress-bar';
  bar.innerHTML = `<div class="skills-container"></div>`;
  if (isFirefox) bar.classList.add('firefox');
  return bar;
}

function Tooltip() {
  const tooltip = document.createElement('div');
  tooltip.className = `${classPrefix}tooltip`;
  return tooltip;
}

function Label(className) {
  const label = document.createElement('span');
  label.classList.add(`${classPrefix}label`);
  label.classList.add(`${classPrefix}${className}`);
  return label;
}

function LabelsContainer() {
  const labelsContainer = document.createElement('div');
  labelsContainer.className = `${classPrefix}labels`;
  return labelsContainer;
}

function getColor(skill) {
  if (skill.accessible) {
    if (skill.levels === skill.finishedLevels) {
      return colors.legendary;
    }

    if (skill.levels - 1 === skill.finishedLevels) {
      return colors.complete;
    }
    return colors[skill.finishedLevels];
  }
  return colors.inaccessible;
}

function getLabelText(skill) {
  if (skill.accessible) {
    if (skill.decayed) {
      return `${skill.name} (Level ${skill.finishedLevels}, Broken)`;
    }

    if (skill.levels === skill.finishedLevels) {
      return `${skill.name} (Level ${skill.finishedLevels}, Legendary)`;
    }

    if (skill.levels - 1 === skill.finishedLevels) {
      return `${skill.name} (Level ${skill.finishedLevels}, Complete)`;
    }

    return `${skill.name} (Level ${skill.finishedLevels})`;
  } else {
    return `${skill.name} (not accessible)`;
  }
}

function skillMouseEnterListener(skill, tooltip) {
  return function () {
    tooltip.classList.add('show');
    tooltip.innerText = getLabelText(skill);
  };
}

function skillMouseLeaveListener(tooltip) {
  return function () {
    tooltip.classList.remove('show');
  };
}

function goToSkill(skill) {
  document.querySelectorAll('[data-test="skill"]').forEach((node) => {
    if (
      node.innerText === skill.shortName ||
      node.innerText === `${skill.finishedLevels}\n${skill.shortName}`
    ) {
      node.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setTimeout(() => {
        node.querySelector('div[tabindex="0"]').click();
      }, 1000);
    }
  });
}

function Button(skill, tooltip, color) {
  const button = document.createElement('button');
  button.className = 'circle';
  button.title = skill.accessible ? 'Click to go to skill' : 'This skill is not accessible';
  button.setAttribute('aria-label', `${getLabelText(skill)}. Click to go to skill.`);
  button.style.backgroundColor = color;
  if (skill.decayed) {
    const decayGraphic = document.createElement('div');
    decayGraphic.setAttribute('aria-hidden', 'true');
    decayGraphic.className = `${classPrefix}decay`;
    button.appendChild(decayGraphic);
  }
  const mouseEnterListener = skillMouseEnterListener(skill, tooltip);
  const mouseLeaveListener = skillMouseLeaveListener(tooltip);
  button.addEventListener('mouseenter', mouseEnterListener);
  button.addEventListener('mouseleave', mouseLeaveListener);
  button.addEventListener('focus', mouseEnterListener);
  button.addEventListener('blur', mouseLeaveListener);
  button.addEventListener('click', () => goToSkill(skill));
  return button;
}

function Line(color) {
  const line = document.createElement('div');
  line.className = 'line';
  line.style.backgroundColor = color;
  return line;
}

function getSkillElement(skill, tooltip) {
  const el = document.createElement('div');
  el.className = 'skill';
  const color = getColor(skill);
  el.appendChild(Button(skill, tooltip, color));
  el.appendChild(Line(color));
  return el;
}

function getPercentage(skills) {
  const allLevels = skills.reduce((acc, value) => acc + value.levels, 0);
  const finishedLevels = skills.reduce((acc, value) => acc + value.finishedLevels, 0);
  return Math.ceil((finishedLevels / allLevels) * 100);
}

function getSkillCompletion(skills) {
  return skills.filter((skill) => skill.finishedLevels >= skill.levels - 1).length;
}

function removeLastLine() {
  const lines = document.querySelectorAll('#duolingo-progress-bar .skill .line');
  lines[lines.length - 1].remove();
}

async function insertBar(bar) {
  const skillTree = await waitForElement('[data-test="skill-tree"]');
  skillTree.parentElement.parentElement.parentElement.parentElement.prepend(bar);
}

async function processSkills(skills) {
  const allSkills = skills.reduce((acc, value) => [...acc, ...value], []);
  const bar = Bar();
  await insertBar(bar);
  const tooltip = Tooltip();
  const labelsContainer = LabelsContainer();
  const percentage = Label('percentage');
  percentage.innerText = `${getPercentage(allSkills)}% complete`;
  labelsContainer.appendChild(percentage);
  const skillCompletion = Label('skillCompletion');
  skillCompletion.innerText = `${getSkillCompletion(allSkills)} / ${
    allSkills.length
  } skills complete`;
  labelsContainer.appendChild(skillCompletion);
  bar.prepend(labelsContainer);
  allSkills
    .map((skill) => getSkillElement(skill, tooltip))
    .forEach((node) => bar.querySelector('.skills-container').appendChild(node));
  bar.prepend(tooltip);
  removeLastLine();
}

function setupUrlObserver(skills) {
  if (location.pathname === '/learn' && !window.duolingoProgressBarArrivedOnLearn) {
    window.duolingoProgressBarArrivedOnLearn = true;
    processSkills(skills);
  }
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      if (location.pathname === '/learn' && !window.duolingoProgressBarArrivedOnLearn) {
        window.duolingoProgressBarArrivedOnLearn = true;
        processSkills(skills);
        return;
      }
      document.querySelector('#duolingo-progress-bar').style.display =
        location.pathname === '/learn' ? 'flex' : 'none';
    }
  }).observe(document, { subtree: true, childList: true });
}