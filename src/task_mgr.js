/**
 * 负责管理所有的任务, 根据系统负荷调度任务, 所有的复杂计算操作, 都应该作为任务调度执行
 * 可以根据当前的CPU使用率和下一帧的时间，来调度执行任务。
 */

import { TaskPool } from "./task_pool";
import { call } from "./utils";

/**
 * n 毫秒以上的任务会打印出来
 */
const logTimeOut = 4;

/**
 * 离渲染开始n毫秒以上的任务会延迟到下一帧执行
 */
const frameTimeOut = 4;

/**
 * 渲染频率
 */
const frameInterval = 16;

/**
 * 创建一个任务池
 */
const taskPool = new TaskPool();

/**
 * 设置任务
 * @param {function} func 需要执行的函数
 * @param {array} args 需要执行的函数的参数
 * @param {*} type 执行类型 0, 1 
 */
export const setFrameTask = (func, args, type = 1) => {
    if (func) {
        taskPool.push(func, args, type);
        if (taskPool.size() === 1) {
            requestAnimationFrame(exec);
        }
    }
}

/**
 * 获取当前任务池里的任务数量
 */
export const getTaskSize = () => taskPool.size();

/**
 * 任务调度
 */
const exec = () => {
    let start = Date.now();
    let end = start;
    while ((start + frameInterval - frameTimeOut) > end) {
        const task = taskPool.pop();
        if (task) {
            end = callTime(task.func, task.args, end);
        } else {
            break;
        }
    }
    // 如果还有任务, 放到下一帧
    if (taskPool.size()) {
        requestAnimationFrame(exec);
    }
}

/**
 * 
 * @param {function} func 
 * @param {array} args 
 * @param {number} start 函数开始执行时间
 */
const callTime = (func, args, start) => {
    try {
        call(func, args);
    } catch (error) {
        throw Error(error);
    }
    let end = Date.now();
    // 单个任务执行超时
    if (end - start > logTimeOut) {
        console.warn(`${func}-${name} >> ${logTimeOut}`)
    }
    return end;
}