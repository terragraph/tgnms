/*
 * Copyright (c) 2019-present, Facebook, Inc.
 * All rights reserved.
 */

package com.terragraph.tgalarms;

import java.util.Collections;
import java.util.Optional;

import org.junit.jupiter.api.TestInfo;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.junit.jupiter.api.extension.TestWatcher;

public class DefaultTestWatcher implements TestWatcher {
	@Override
	public void testSuccessful(ExtensionContext extensionContext) {
		System.out.printf("==> PASS\n\n");
	}

	@Override
	public void testFailed(ExtensionContext extensionContext, Throwable throwable) {
		throwable.printStackTrace();
		System.out.printf("==> FAIL\n\n");
	}

	@Override
	public void testAborted(ExtensionContext extensionContext, Throwable throwable) {
		System.out.printf("==> ABORTED\n\n");
	}

	@Override
	public void testDisabled(ExtensionContext extensionContext, Optional<String> optional) {
		System.out.printf("==> Test is disabled.\n\n");
	}

	/** Utility to print the test name before each test. */
	public static void printTestName(TestInfo testInfo) {
		String testName =
			String.format(" %s.%s ", testInfo.getTestClass().get().getSimpleName(), testInfo.getDisplayName());
		String divider = String.join("", Collections.nCopies(testName.length(), "-"));
		System.out.printf("%s\n%s\n%s\n", divider, testName, divider);
	}
}
