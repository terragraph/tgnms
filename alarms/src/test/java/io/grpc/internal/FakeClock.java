/*
 * Copyright 2015 The gRPC Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package io.grpc.internal;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.Delayed;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.PriorityBlockingQueue;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * A manipulated clock that exports a {@link ScheduledExecutorService}.
 *
 * <p>To simulate the locking scenario of using real executors, it never runs tasks within {@code
 * schedule()} or {@code execute()}. Instead, you should call {@link #runDueTasks} in your test
 * method to run all due tasks. {@link #forwardTime} calls {@link #runDueTasks} automatically.
 *
 * Modifications to the original code strip unneeded functionality and dependencies.
 */
public final class FakeClock {
	private final ScheduledExecutorService scheduledExecutorService = new ScheduledExecutorImpl();

	private final PriorityBlockingQueue<ScheduledTask> scheduledTasks = new PriorityBlockingQueue<>();
	private final LinkedBlockingQueue<ScheduledTask> dueTasks = new LinkedBlockingQueue<>();

	private long currentTimeNanos;

	public class ScheduledTask implements ScheduledFuture<Void> {
		public final Runnable command;
		public final long dueTimeNanos;
		private boolean isCancelled;
		private boolean isDone;

		ScheduledTask(long dueTimeNanos, Runnable command) {
			this.dueTimeNanos = dueTimeNanos;
			this.command = command;
		}

		@Override
		public boolean cancel(boolean mayInterruptIfRunning) {
			if (isCancelled || isDone) {
				return false;
			}
			scheduledTasks.remove(this);
			dueTasks.remove(this);
			isCancelled = true;
			return true;
		}

		@Override
		public long getDelay(TimeUnit unit) {
			return unit.convert(dueTimeNanos - currentTimeNanos, TimeUnit.NANOSECONDS);
		}

		@Override
		public int compareTo(Delayed other) {
			ScheduledTask otherTask = (ScheduledTask) other;
			if (dueTimeNanos > otherTask.dueTimeNanos) {
				return 1;
			} else if (dueTimeNanos < otherTask.dueTimeNanos) {
				return -1;
			} else {
				return 0;
			}
		}

		void complete() {
			isDone = true;
		}

		@Override
		public String toString() {
			return "[due=" + dueTimeNanos + ", task=" + command + "]";
		}

		@Override
		public Void get() throws InterruptedException, ExecutionException {
			return null;
		}

		@Override
		public Void get(long timeout, TimeUnit unit) throws InterruptedException, ExecutionException, TimeoutException {
			return null;
		}

		@Override
		public boolean isCancelled() {
			return isCancelled;
		}

		@Override
		public boolean isDone() {
			return isDone;
		}
	}

	private class ScheduledExecutorImpl implements ScheduledExecutorService {
		private boolean isShutdown;
		private boolean isTerminated;

		@Override
		public <V> ScheduledFuture<V> schedule(Callable<V> callable, long delay, TimeUnit unit) {
			throw new UnsupportedOperationException();
		}

		@Override
		public ScheduledFuture<?> schedule(Runnable cmd, long delay, TimeUnit unit) {
			ScheduledTask task = new ScheduledTask(currentTimeNanos + unit.toNanos(delay), cmd);
			if (delay > 0) {
				scheduledTasks.add(task);
			} else {
				dueTasks.add(task);
			}
			return task;
		}

		@Override
		public ScheduledFuture<?> scheduleAtFixedRate(Runnable command, long initialDelay, long period, TimeUnit unit) {
			throw new UnsupportedOperationException();
		}

		@Override
		public ScheduledFuture<?> scheduleWithFixedDelay(Runnable command, long initialDelay, long delay,
			TimeUnit unit) {
			throw new UnsupportedOperationException();
		}

		@Override
		public boolean awaitTermination(long timeout, TimeUnit unit) {
			throw new UnsupportedOperationException();
		}

		@Override
		public <T> List<Future<T>> invokeAll(Collection<? extends Callable<T>> tasks) {
			throw new UnsupportedOperationException();
		}

		@Override
		public <T> List<Future<T>> invokeAll(Collection<? extends Callable<T>> tasks, long timeout, TimeUnit unit) {
			throw new UnsupportedOperationException();
		}

		@Override
		public <T> T invokeAny(Collection<? extends Callable<T>> tasks) {
			throw new UnsupportedOperationException();
		}

		@Override
		public <T> T invokeAny(Collection<? extends Callable<T>> tasks, long timeout, TimeUnit unit) {
			throw new UnsupportedOperationException();
		}

		@Override
		public boolean isShutdown() {
			return isShutdown;
		}

		@Override
		public boolean isTerminated() {
			return isTerminated;
		}

		@Override
		public void shutdown() {
			isShutdown = true;
			isTerminated = true;
		}

		@Override
		public List<Runnable> shutdownNow() {
			shutdown();
			return new ArrayList<>(0);
		}

		@Override
		public <T> Future<T> submit(Callable<T> task) {
			throw new UnsupportedOperationException();
		}

		@Override
		public Future<?> submit(Runnable task) {
			throw new UnsupportedOperationException();
		}

		@Override
		public <T> Future<T> submit(Runnable task, T result) {
			throw new UnsupportedOperationException();
		}

		@Override
		public void execute(Runnable command) {
			schedule(command, 0, TimeUnit.NANOSECONDS);
		}
	}

	/**
	 * Provides a partially implemented instance of {@link ScheduledExecutorService}
	 * that uses the fake clock ticker for testing.
	 */
	public ScheduledExecutorService getScheduledExecutorService() {
		return scheduledExecutorService;
	}

	/**
	 * Run all due tasks. Immediately due tasks that are queued during the process
	 * also get executed.
	 *
	 * @return the number of tasks run by this call
	 */
	public int runDueTasks() {
		int count = 0;
		while (true) {
			checkDueTasks();
			if (dueTasks.isEmpty()) {
				break;
			}
			ScheduledTask task;
			while ((task = dueTasks.poll()) != null) {
				task.command.run();
				task.complete();
				count++;
			}
		}
		return count;
	}

	private void checkDueTasks() {
		while (true) {
			ScheduledTask task = scheduledTasks.peek();
			if (task == null || task.dueTimeNanos > currentTimeNanos) {
				break;
			}
			if (scheduledTasks.remove(task)) {
				dueTasks.add(task);
			}
		}
	}

	/**
	 * Return all due tasks.
	 */
	public Collection<ScheduledTask> getDueTasks() {
		checkDueTasks();
		return new ArrayList<>(dueTasks);
	}

	/**
	 * Return all unrun tasks.
	 */
	public Collection<ScheduledTask> getPendingTasks() {
		return Stream.concat(dueTasks.stream(), scheduledTasks.stream()).collect(Collectors.toList());
	}

	/**
	 * Forward the time by the given duration and run all due tasks.
	 *
	 * @return the number of tasks run by this call
	 */
	public int forwardTime(long value, TimeUnit unit) {
		currentTimeNanos += unit.toNanos(value);
		return runDueTasks();
	}

	/**
	 * Return the number of queued tasks.
	 */
	public int numPendingTasks() {
		return dueTasks.size() + scheduledTasks.size();
	}
}
