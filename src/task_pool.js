/**
 * 任务池
 * 信息: {
 *      function: // 任务的调用函数
 *      args: // 参数
 *      type: // 立即执行(0) 顺序执行(1) 
 *  }
 */

/**
 * 任务缓存
 */
export class TaskPool {
    constructor() {
        // 需要优先执行
        this.taskZero = [];
        // 顺序执行
        this.taskOne = [];
    }
    // 获取任务池数量
    size() {
        return this.taskZero.length + this.taskOne.length;
    }
    // 添加任务
    push(func, args = [], type) {
        if (type === 0) {
            this.taskZero.push({func, args});
        } else {
            this.taskOne.push({func, args})
        }
    }
    // 读取任务
    pop() {
        if (this.taskZero.length > 0) {
            return this.taskZero.pop();
        }
        if (this.taskOne.length > 0) {
            return this.taskOne.pop();
        }
        return null;
    }
}