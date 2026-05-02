// Expo config plugin: makes incoming .trotter files readable in JS.
//
// iOS hands files from iMessage / Files / share sheet to apps as security-scoped
// URLs. The scope is only active inside the native application(_:open:url:options:)
// callback, so we acquire it there, copy the file into our cache directory, and
// forward the sandbox URL to JS. Without this, expo-file-system reads/copies fail
// with "is not readable" because the JS layer has no scope.
//
// Wired into app.json via "plugins": ["./plugins/withTrotterFileImport"].

const { withAppDelegate } = require('@expo/config-plugins');

const HELPER_METHOD = `
  private func copyIncomingFileToCacheIfNeeded(_ sourceUrl: URL) -> URL? {
    guard sourceUrl.isFileURL, sourceUrl.pathExtension.lowercased() == "trotter" else {
      return nil
    }
    let didStart = sourceUrl.startAccessingSecurityScopedResource()
    defer {
      if didStart { sourceUrl.stopAccessingSecurityScopedResource() }
    }
    guard let cacheDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first else {
      return nil
    }
    let timestamp = Int(Date().timeIntervalSince1970 * 1000)
    let destUrl = cacheDir.appendingPathComponent("imported_\\(timestamp).trotter")
    do {
      if FileManager.default.fileExists(atPath: destUrl.path) {
        try FileManager.default.removeItem(at: destUrl)
      }
      try FileManager.default.copyItem(at: sourceUrl, to: destUrl)
      return destUrl
    } catch {
      NSLog("Trotter: failed to copy incoming .trotter file: \\(error.localizedDescription)")
      return nil
    }
  }
`;

const ORIGINAL_RETURN =
  'return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)';

const REPLACEMENT_RETURN =
  'let forwardedUrl = copyIncomingFileToCacheIfNeeded(url) ?? url\n    return super.application(app, open: forwardedUrl, options: options) || RCTLinkingManager.application(app, open: forwardedUrl, options: options)';

function modify(contents) {
  if (contents.includes('copyIncomingFileToCacheIfNeeded')) {
    return contents;
  }

  if (!contents.includes(ORIGINAL_RETURN)) {
    throw new Error(
      'withTrotterFileImport: could not find the expected open-URL return statement in AppDelegate.swift. The Expo template may have changed — update plugins/withTrotterFileImport.js.'
    );
  }

  let next = contents.replace(ORIGINAL_RETURN, REPLACEMENT_RETURN);

  // Inject the helper method just before the "// Universal Links" comment.
  const universalLinksMarker = '// Universal Links';
  if (!next.includes(universalLinksMarker)) {
    throw new Error(
      'withTrotterFileImport: could not find the "// Universal Links" anchor in AppDelegate.swift.'
    );
  }
  next = next.replace(universalLinksMarker, HELPER_METHOD + '\n  ' + universalLinksMarker);

  return next;
}

module.exports = function withTrotterFileImport(config) {
  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== 'swift') {
      throw new Error(
        `withTrotterFileImport: expected Swift AppDelegate, got ${cfg.modResults.language}.`
      );
    }
    cfg.modResults.contents = modify(cfg.modResults.contents);
    return cfg;
  });
};

module.exports._modify = modify;
