/**
 * Task Parser
 * 
 * This module provides functionality to parse and manipulate task lists
 * in markdown files, particularly README.md files.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';

/**
 * Parses task lists from a markdown file
 * 
 * @param {string} filePath - Path to the markdown file
 * @returns {Array} Array of task objects
 */
export async function parseTaskList(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    const processor = unified().use(remarkParse);
    const ast = processor.parse(content);

    const tasks = [];
    const lines = content.split('\n');

    visit(ast, 'list', (node, index, parent) => {
      if (node.children) {
        node.children.forEach((listItem, itemIndex) => {
          if (listItem.type === 'listItem') {
            const task = parseListItem(listItem, lines, node.position);
            if (task) {
              tasks.push({
                ...task,
                id: `task-${tasks.length + 1}`,
                listIndex: itemIndex,
                parentIndex: index
              });
            }
          }
        });
      }
    });

    return tasks;
  } catch (error) {
    throw new Error(`Failed to parse task list from ${filePath}: ${error.message}`);
  }
}

/**
 * Parses a single list item to extract task information
 * 
 * @param {Object} listItem - AST list item node
 * @param {Array} lines - File lines for position mapping
 * @param {Object} listPosition - Position of the parent list
 * @returns {Object|null} Task object or null if not a task
 */
function parseListItem(listItem, lines, listPosition) {
  if (!listItem.children || listItem.children.length === 0) {
    return null;
  }

  const paragraph = listItem.children.find(child => child.type === 'paragraph');
  if (!paragraph || !paragraph.children) {
    return null;
  }

  // Extract text content
  let text = '';
  let completed = false;

  paragraph.children.forEach(child => {
    if (child.type === 'text') {
      text += child.value;
    } else if (child.type === 'html' && child.value.includes('input')) {
      // GitHub-style checkbox: - [ ] or - [x]
      completed = child.value.includes('checked') || child.value.includes('[x]');
    }
  });

  // Check for checkbox syntax in text
  const checkboxMatch = text.match(/^\s*\[([x\s])\]\s*(.*)/i);
  if (checkboxMatch) {
    completed = checkboxMatch[1].toLowerCase() === 'x';
    text = checkboxMatch[2];
  }

  // Only return if it looks like a task (has checkbox or is in a task-like context)
  if (!checkboxMatch && !listItem.checked !== undefined) {
    return null;
  }

  // Estimate line number (this is approximate due to markdown parsing)
  const lineNumber = listPosition ? listPosition.start.line + listItem.position?.start?.line - 1 : null;

  return {
    text: text.trim(),
    completed: completed || listItem.checked || false,
    line: lineNumber,
    priority: extractPriority(text),
    tags: extractTags(text)
  };
}

/**
 * Extracts priority from task text
 * 
 * @param {string} text - Task text
 * @returns {string} Priority level
 */
function extractPriority(text) {
  const priorityPatterns = {
    high: /\b(urgent|high|important|critical|!!|🔥)\b/i,
    medium: /\b(medium|moderate|!\s|⚠️)\b/i,
    low: /\b(low|minor|optional|later)\b/i
  };

  for (const [priority, pattern] of Object.entries(priorityPatterns)) {
    if (pattern.test(text)) {
      return priority;
    }
  }

  return 'normal';
}

/**
 * Extracts tags from task text
 * 
 * @param {string} text - Task text
 * @returns {Array} Array of tags
 */
function extractTags(text) {
  const tagPattern = /#(\w+)/g;
  const tags = [];
  let match;

  while ((match = tagPattern.exec(text)) !== null) {
    tags.push(match[1].toLowerCase());
  }

  return tags;
}

/**
 * Updates a task list in a markdown file
 * 
 * @param {string} filePath - Path to the markdown file
 * @param {Array} updates - Array of task updates
 * @returns {boolean} Success status
 */
export async function updateTaskList(filePath, updates) {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    let lines = content.split('\n');
    const currentTasks = await parseTaskList(filePath);
    
    // Create a backup
    const backupContent = content;

    // Apply updates
    for (const update of updates) {
      if (update.action === 'complete') {
        lines = markTaskCompleted(lines, update.taskText);
      } else if (update.action === 'add') {
        lines = addNewTask(lines, update.taskText, update.section);
      } else if (update.action === 'update') {
        lines = updateTaskText(lines, update.oldText, update.newText);
      }
    }

    // Write the updated content
    const updatedContent = lines.join('\n');
    writeFileSync(filePath, updatedContent, 'utf-8');

    // Verify the update was successful
    try {
      await parseTaskList(filePath);
      return true;
    } catch (verifyError) {
      // Rollback on verification failure
      writeFileSync(filePath, backupContent, 'utf-8');
      throw new Error(`Update verification failed, rolled back: ${verifyError.message}`);
    }

  } catch (error) {
    throw new Error(`Failed to update task list: ${error.message}`);
  }
}

/**
 * Marks a task as completed in the markdown content
 * 
 * @param {Array} lines - File lines
 * @param {string} taskText - Task text to mark as completed
 * @returns {Array} Updated lines
 */
function markTaskCompleted(lines, taskText) {
  const updatedLines = [...lines];

  for (let i = 0; i < updatedLines.length; i++) {
    const line = updatedLines[i];
    
    // Look for task patterns
    if (line.includes(taskText)) {
      // GitHub-style checkbox
      if (line.match(/^\s*-\s*\[\s\]/)) {
        updatedLines[i] = line.replace(/^\s*-\s*\[\s\]/, '- [x]');
        break;
      }
      // HTML checkbox
      else if (line.includes('type="checkbox"') && !line.includes('checked')) {
        updatedLines[i] = line.replace('type="checkbox"', 'type="checkbox" checked');
        break;
      }
    }
  }

  return updatedLines;
}

/**
 * Adds a new task to the markdown content
 * 
 * @param {Array} lines - File lines
 * @param {string} taskText - New task text
 * @param {string} section - Target section (optional)
 * @returns {Array} Updated lines
 */
function addNewTask(lines, taskText, section = null) {
  const updatedLines = [...lines];
  
  if (section) {
    // Find the section and add task there
    const sectionIndex = findSectionIndex(updatedLines, section);
    if (sectionIndex !== -1) {
      const insertIndex = findTaskListInSection(updatedLines, sectionIndex);
      updatedLines.splice(insertIndex, 0, `- [ ] ${taskText}`);
      return updatedLines;
    }
  }

  // Find existing task list or create one
  const taskListIndex = findFirstTaskList(updatedLines);
  
  if (taskListIndex !== -1) {
    // Add to existing task list
    const insertIndex = findEndOfTaskList(updatedLines, taskListIndex);
    updatedLines.splice(insertIndex, 0, `- [ ] ${taskText}`);
  } else {
    // Create new task list at end of file
    updatedLines.push('', '## Tasks', '', `- [ ] ${taskText}`);
  }

  return updatedLines;
}

/**
 * Updates task text in the markdown content
 * 
 * @param {Array} lines - File lines
 * @param {string} oldText - Old task text
 * @param {string} newText - New task text
 * @returns {Array} Updated lines
 */
function updateTaskText(lines, oldText, newText) {
  const updatedLines = [...lines];

  for (let i = 0; i < updatedLines.length; i++) {
    const line = updatedLines[i];
    if (line.includes(oldText)) {
      updatedLines[i] = line.replace(oldText, newText);
      break;
    }
  }

  return updatedLines;
}

/**
 * Finds the index of a section header
 * 
 * @param {Array} lines - File lines
 * @param {string} sectionName - Section name to find
 * @returns {number} Line index or -1 if not found
 */
function findSectionIndex(lines, sectionName) {
  const pattern = new RegExp(`^#{1,6}\\s+${sectionName}`, 'i');
  
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      return i;
    }
  }
  
  return -1;
}

/**
 * Finds the first task list in the file
 * 
 * @param {Array} lines - File lines
 * @returns {number} Line index or -1 if not found
 */
function findFirstTaskList(lines) {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^\s*-\s*\[[x\s]\]/)) {
      return i;
    }
  }
  return -1;
}

/**
 * Finds a task list within a section
 * 
 * @param {Array} lines - File lines
 * @param {number} sectionIndex - Section start index
 * @returns {number} Insert index for new task
 */
function findTaskListInSection(lines, sectionIndex) {
  // Look for existing task list in section
  for (let i = sectionIndex + 1; i < lines.length; i++) {
    // Stop at next section
    if (lines[i].match(/^#{1,6}\s+/)) {
      return i;
    }
    
    // Found task list, return end of it
    if (lines[i].match(/^\s*-\s*\[[x\s]\]/)) {
      return findEndOfTaskList(lines, i) + 1;
    }
  }
  
  // No task list found, insert after section header
  return sectionIndex + 1;
}

/**
 * Finds the end of a task list
 * 
 * @param {Array} lines - File lines
 * @param {number} startIndex - Task list start index
 * @returns {number} End index
 */
function findEndOfTaskList(lines, startIndex) {
  for (let i = startIndex; i < lines.length; i++) {
    if (!lines[i].match(/^\s*-\s*\[[x\s]\]/) && lines[i].trim() !== '') {
      return i;
    }
  }
  return lines.length;
}

/**
 * Gets task statistics
 * 
 * @param {Array} tasks - Array of tasks
 * @returns {Object} Task statistics
 */
export function getTaskStats(tasks) {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = total - completed;
  
  const byPriority = {
    high: tasks.filter(t => t.priority === 'high').length,
    medium: tasks.filter(t => t.priority === 'medium').length,
    low: tasks.filter(t => t.priority === 'low').length,
    normal: tasks.filter(t => t.priority === 'normal').length
  };

  return {
    total,
    completed,
    pending,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    byPriority
  };
}