"""Inject release signing config into the generated Android project.

Run from the repo root AFTER `cap add android`, and only when
android/keystore.properties exists (the CI workflow writes it from secrets).
"""

from pathlib import Path

GRADLE = Path("android/app/build.gradle")

HEADER = (
    "def bevisSigning = new Properties()\n"
    "def bevisSigningFile = rootProject.file('keystore.properties')\n"
    "if (bevisSigningFile.exists()) "
    "{ bevisSigningFile.withInputStream { bevisSigning.load(it) } }\n\n"
)

SIGNING_BLOCK = """
    signingConfigs {
        release {
            if (bevisSigning['storeFile']) {
                storeFile file(bevisSigning['storeFile'])
                storePassword bevisSigning['storePassword']
                keyAlias bevisSigning['keyAlias']
                keyPassword bevisSigning['keyPassword']
            }
        }
    }
"""


def main() -> None:
    source = GRADLE.read_text()
    if "bevisSigning" in source:
        print("Signing config already present - nothing to do.")
        return

    source = HEADER + source

    marker = "android {"
    index = source.index(marker) + len(marker)
    source = source[:index] + SIGNING_BLOCK + source[index:]

    source = source.replace(
        "buildTypes {\n        release {",
        "buildTypes {\n        release {\n            signingConfig signingConfigs.release",
        1,
    )

    GRADLE.write_text(source)
    print("Release signing config written to android/app/build.gradle")


if __name__ == "__main__":
    main()
