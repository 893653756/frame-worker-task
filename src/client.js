/**
 * 该模块提供任务组, worker 子线程执行计算任务, 适用于有大量耗时计算的web应用, 保证页面的流畅性
 * 在保证性能的情况下，最多创建 4 个worker
 */
import { TaskPool } from "./task_pool";
import { setFrameTask } from "./task_mgr";
import { call } from "./utils";
let MyWorker = require("worker-loader!./worker.js");

/**
 * 任务组表
 * 每组任务 {
 *      name: string, 任务组名称
 *      taskPool: TaskPool, // 任务池
 *      waitWorkers: [Worker], // worker 数组
 *      workerCount: number, // worker 数量
 *      initWorkerFail: boolean // 创建worker 是否成功
 *   }
 */
const groupMap = new Map();

/**
 * 
 * @param {string} groupName 任务组名字 
 * @param {number} workerCount worker数量 
 */
export const createTaskGroup = (groupName, workerCount) => {
    let group = groupMap.get(groupName);
    if (group) {
        throw new Error(`group is created, name:${groupName}`);
    }
    group = {
        name: groupName,
        taskPool: undefined,
        waitWorkers: [],
        workerCount: workerCount,
        initWorkerFail: false
    };
    for (let i = 0; i < workerCount; i++) {
        initWorker(group, i);
        if (group.initWorkerFail) {
            break;
        }
    }
    if (!group.initWorkerFail) {
        group.taskPool = new TaskPool();
    }
    groupMap.set(groupName, group);
}

/**
 * 关闭worker
 */
export const closeWorkers = () => {
    // todo
    // worker.terminate()
}

/**
 * 初始化子线程(worker)
 */
const initWorker = function (group, i) {
    let worker;
    try {
        worker = new MyWorker();
    } catch (error) {
        group.initWorkerFail = true;
        return;
    }
    const name = `${group.name}:${i + 1}`;
    worker.name = name;
    group.waitWorkers.push(worker);
};

/**
 * 设置任务
 * @param {String} groupName 任务组名
 * @param {Function} func 方法
 * @param {Any} args 参数
 * @param {Number} type 任务类型 立即执行(0) 顺序执行(1)
 * @param {Function} successCB 成功回调
 * @param {Function} errorCB 失败回调
 */
export const setWorkerTask = (groupName, func, args = [], type, successCB, errorCB) => {
    const group = groupMap.get(groupName);
    if (!group) {
        throw new Error(`group not found, name:${groupName}`);
    }
    // 如果worker 创建失败, 则启用 frame-task
    if (group.initWorkerFail) {
        setFrameTask(function (func, args, successCB, errorCB) {
            try {
                let result = call(func, args)
                successCB && successCB(result);
            } catch (error) {
                errorCB && errorCB(error);
            }
        }, [func, args, successCB, errorCB], type)
        return;
    }
    // 放入子线程
    group.taskPool.push(func, [args, successCB, errorCB], type);
    // 开始执行任务
    startWorker(group);
}

/**
 * 开始worker 任务
 */
const startWorker = (group) => {
    let worker;
    let arr = group.waitWorkers;
    let len = arr.length - 1;
    // 暂时没有空闲的worker
    if (len < 0) {
        return;
    }
    // 取出任务
    let task = group.taskPool.pop();
    if (!task) {
        return
    }
    worker = arr[len];
    arr.length = len;
    worker.onmessage = curryFunc(handleMessage, group, worker, task.args);
    worker.postMessage({
        func: task.func.toString(),
        args: task.args[0]
    })
}

/**
 * 处理重worker 返回的消息到底消息
 */
const handleMessage = (e, group, worker, args) => {
    const date = e.date;
    let task = group.taskPool.pop();
    if (task) {
        worker.onmessage = curryFunc(handleMessage,group, worker, task.args);
        worker.postMessage({
            func: task.func.toString(),
            args: task.args[0]
        })
    } else {
        group.waitWorkers.push(worker);
    }
    if (date.error) {
        args[2] && args[2](data.error);
        return;
    }
    args[1] && args[1](date.ok);
}

/**
 * 处理函数科里化
 */
const curryFunc = (func, group, worker, args) => {
    return function (e) {
        return func(e, group, worker, args);
    }
}
