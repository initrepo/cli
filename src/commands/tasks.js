/**
 * Tasks Command
 * 
 * This module handles the tasks command for managing task lists
 * in markdown files, particularly README.md files.
 */

import { join, resolve } from 'path';
import { existsSync } from 'fs';
import * as ui from '../ui-handler.js';
import { parseTaskList, updateTaskList, getTaskStats } from '../parsers/task-parser.js';
import { formatTaskList, formatSuccess, formatError, safeStringify } from '../utils/json-formatter.js';

/**
 * Configures the tasks command
 * 
 * @param {Command} program - Commander.js program instance
 */
export function configureTasksCommand(program) {
  program
    .command('tasks')
    .alias('task')
    .description('Manage task lists in markdown files')
    .option('-l, --list', 'List all tasks', false)
    .option('-a, --add <text>', 'Add a new task', null)
    .option('-c, --complete <text>', 'Mark a task as completed', null)
    .option('-u, --update <oldText> <newText>', 'Update task text', null)
    .option('-f, --file <file>', 'Target markdown file (default: README.md)', 'README.md')
    .option('--format <format>', 'Output format: json or text', 'text')
    .option('--stats', 'Show task statistics', false)
    .option('-o, --output <file>', 'Output to file instead of stdout', null)
    .action(async (options) => {
      try {
        await handleTasksCommand(options);
      } catch (error) {
        if (options.format === 'json') {
          console.error(safeStringify(formatError(error.message, 'TASKS_ERROR')));
        } else {
          ui.displayError(`Error: ${error.message}`);
        }
        process.exit(1);
      }
    });
}

/**
 * Handles the tasks command execution
 * 
 * @param {Object} options - Command options
 */
async function handleTasksCommand(options) {
  const workingDir = process.cwd();
  const filePath = resolve(workingDir, options.file);

  // Check if file exists
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${options.file}`);
  }

  try {
    // Determine operation
    if (options.add) {
      await addTask(filePath, options.add, options);
    } else if (options.complete) {
      await completeTask(filePath, options.complete, options);
    } else if (options.update && Array.isArray(options.update) && options.update.length === 2) {
      await updateTask(filePath, options.update[0], options.update[1], options);
    } else {
      // Default: list tasks
      await listTasks(filePath, options);
    }

  } catch (error) {
    throw new Error(`Failed to manage tasks: ${error.message}`);
  }
}

/**
 * Lists all tasks from the markdown file
 * 
 * @param {string} filePath - Path to markdown file
 * @param {Object} options - Command options
 */
async function listTasks(filePath, options) {
  if (options.format !== 'json') {
    ui.displayInfo(`Reading tasks from ${options.file}...`);
  }

  const tasks = await parseTaskList(filePath);

  if (tasks.length === 0) {
    if (options.format === 'json') {
      const result = formatSuccess(formatTaskList([]), 'No tasks found');
      console.log(safeStringify(result, true));
    } else {
      ui.displayWarning(`No tasks found in ${options.file}`);
    }
    return;
  }

  if (options.format === 'json') {
    await outputTasksJson(tasks, filePath, options);
  } else {
    await outputTasksText(tasks, filePath, options);
  }
}

/**
 * Adds a new task to the markdown file
 * 
 * @param {string} filePath - Path to markdown file
 * @param {string} taskText - New task text
 * @param {Object} options - Command options
 */
async function addTask(filePath, taskText, options) {
  if (options.format !== 'json') {
    ui.displayInfo(`Adding task: "${taskText}"`);
  }

  const updates = [{
    action: 'add',
    taskText: taskText
  }];

  const success = await updateTaskList(filePath, updates);

  if (success) {
    if (options.format === 'json') {
      const result = formatSuccess(
        { action: 'add', taskText, file: options.file },
        'Task added successfully'
      );
      console.log(safeStringify(result, true));
    } else {
      ui.displaySuccess(`Task added: "${taskText}"`);
    }
  } else {
    throw new Error('Failed to add task');
  }
}

/**
 * Marks a task as completed
 * 
 * @param {string} filePath - Path to markdown file
 * @param {string} taskText - Task text to complete
 * @param {Object} options - Command options
 */
async function completeTask(filePath, taskText, options) {
  if (options.format !== 'json') {
    ui.displayInfo(`Marking task as completed: "${taskText}"`);
  }

  // First, find tasks that match the text
  const existingTasks = await parseTaskList(filePath);
  const matchingTasks = existingTasks.filter(task => 
    task.text.toLowerCase().includes(taskText.toLowerCase()) && !task.completed
  );

  if (matchingTasks.length === 0) {
    throw new Error(`No incomplete task found matching: "${taskText}"`);
  }

  if (matchingTasks.length > 1) {
    throw new Error(`Multiple tasks match "${taskText}". Please be more specific.`);
  }

  const taskToComplete = matchingTasks[0];
  const updates = [{
    action: 'complete',
    taskText: taskToComplete.text
  }];

  const success = await updateTaskList(filePath, updates);

  if (success) {
    if (options.format === 'json') {
      const result = formatSuccess(
        { action: 'complete', taskText: taskToComplete.text, file: options.file },
        'Task completed successfully'
      );
      console.log(safeStringify(result, true));
    } else {
      ui.displaySuccess(`Task completed: "${taskToComplete.text}"`);
    }
  } else {
    throw new Error('Failed to complete task');
  }
}

/**
 * Updates a task's text
 * 
 * @param {string} filePath - Path to markdown file
 * @param {string} oldText - Old task text
 * @param {string} newText - New task text
 * @param {Object} options - Command options
 */
async function updateTask(filePath, oldText, newText, options) {
  if (options.format !== 'json') {
    ui.displayInfo(`Updating task: "${oldText}" → "${newText}"`);
  }

  const updates = [{
    action: 'update',
    oldText: oldText,
    newText: newText
  }];

  const success = await updateTaskList(filePath, updates);

  if (success) {
    if (options.format === 'json') {
      const result = formatSuccess(
        { action: 'update', oldText, newText, file: options.file },
        'Task updated successfully'
      );
      console.log(safeStringify(result, true));
    } else {
      ui.displaySuccess(`Task updated: "${oldText}" → "${newText}"`);
    }
  } else {
    throw new Error('Failed to update task');
  }
}

/**
 * Outputs tasks in JSON format
 * 
 * @param {Array} tasks - Array of tasks
 * @param {string} filePath - Source file path
 * @param {Object} options - Command options
 */
async function outputTasksJson(tasks, filePath, options) {
  const formattedTasks = formatTaskList(tasks);
  const stats = getTaskStats(tasks);

  let result;
  if (options.stats) {
    result = formatSuccess({
      file: options.file,
      stats,
      tasks: formattedTasks
    }, `Found ${tasks.length} tasks`);
  } else {
    result = formatSuccess(formattedTasks, `Found ${tasks.length} tasks`);
  }

  const output = safeStringify(result, true);

  if (options.output) {
    const { writeFileSync } = await import('fs');
    writeFileSync(options.output, output, 'utf-8');
  } else {
    console.log(output);
  }
}

/**
 * Outputs tasks in text format
 * 
 * @param {Array} tasks - Array of tasks
 * @param {string} filePath - Source file path
 * @param {Object} options - Command options
 */
async function outputTasksText(tasks, filePath, options) {
  const stats = getTaskStats(tasks);
  
  let output = `\n📋 Tasks from ${options.file}\n\n`;

  // Statistics
  if (options.stats || tasks.length > 10) {
    output += '📊 Statistics:\n';
    output += `   Total: ${stats.total}\n`;
    output += `   Completed: ${stats.completed} (${stats.completionRate}%)\n`;
    output += `   Pending: ${stats.pending}\n`;

    if (stats.byPriority.high > 0) output += `   🔥 High Priority: ${stats.byPriority.high}\n`;
    if (stats.byPriority.medium > 0) output += `   ⚠️  Medium Priority: ${stats.byPriority.medium}\n`;
    if (stats.byPriority.low > 0) output += `   🔵 Low Priority: ${stats.byPriority.low}\n`;
    
    output += '\n';
  }

  // Group tasks by completion status
  const completedTasks = tasks.filter(t => t.completed);
  const pendingTasks = tasks.filter(t => !t.completed);

  // Pending tasks first
  if (pendingTasks.length > 0) {
    output += '🔄 Pending Tasks:\n';
    pendingTasks.forEach((task, index) => {
      const priorityIcon = getPriorityIcon(task.priority);
      const lineInfo = task.line ? ` (line ${task.line})` : '';
      
      output += `   ${index + 1}. ${priorityIcon} ${task.text}${lineInfo}\n`;
      
      if (task.tags && task.tags.length > 0) {
        output += `      Tags: ${task.tags.map(tag => `#${tag}`).join(' ')}\n`;
      }
    });
    output += '\n';
  }

  // Completed tasks
  if (completedTasks.length > 0 && !options.stats) {
    output += '✅ Completed Tasks:\n';
    completedTasks.forEach((task, index) => {
      const priorityIcon = getPriorityIcon(task.priority);
      const lineInfo = task.line ? ` (line ${task.line})` : '';
      
      output += `   ${index + 1}. ${priorityIcon} ${task.text}${lineInfo}\n`;
    });
    output += '\n';
  }

  // Progress bar
  if (stats.total > 0) {
    const progressBar = createProgressBar(stats.completionRate);
    output += `📈 Progress: ${progressBar} ${stats.completionRate}%\n`;
  }

  if (options.output) {
    const { writeFileSync } = await import('fs');
    writeFileSync(options.output, output, 'utf-8');
    ui.displaySuccess(`Tasks written to ${options.output}`);
  } else {
    console.log(output);
  }
}

/**
 * Gets a priority icon for a task
 * 
 * @param {string} priority - Task priority
 * @returns {string} Priority icon
 */
function getPriorityIcon(priority) {
  const icons = {
    high: '🔥',
    medium: '⚠️',
    low: '🔵',
    normal: '📝'
  };
  
  return icons[priority] || icons.normal;
}

/**
 * Creates a visual progress bar
 * 
 * @param {number} percentage - Completion percentage
 * @returns {string} Progress bar string
 */
function createProgressBar(percentage) {
  const width = 20;
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  
  return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
}