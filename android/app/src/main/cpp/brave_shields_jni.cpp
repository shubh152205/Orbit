#include <jni.h>
#include <string>
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <algorithm>
#include <cstring>
#include <android/log.h>

#define TAG "BraveShieldsJNI"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, TAG, __VA_ARGS__)

namespace {

enum ResourceType {
    RES_ANY = 0,
    RES_SCRIPT = 1 << 0,
    RES_IMAGE = 1 << 1,
    RES_STYLESHEET = 1 << 2,
    RES_SUBDOCUMENT = 1 << 3,
    RES_XMLHTTPREQUEST = 1 << 4,
    RES_FONT = 1 << 5,
    RES_MEDIA = 1 << 6,
    RES_OTHER = 1 << 7
};

ResourceType parseResourceType(const std::string& typeStr) {
    if (typeStr == "script") return RES_SCRIPT;
    if (typeStr == "image") return RES_IMAGE;
    if (typeStr == "stylesheet") return RES_STYLESHEET;
    if (typeStr == "subdocument") return RES_SUBDOCUMENT;
    if (typeStr == "xmlhttprequest") return RES_XMLHTTPREQUEST;
    if (typeStr == "font") return RES_FONT;
    if (typeStr == "media") return RES_MEDIA;
    return RES_OTHER;
}

enum PartyConstraint {
    PARTY_ANY = 0,
    PARTY_THIRD_ONLY,
    PARTY_FIRST_ONLY
};

struct FilterRule {
    bool isException = false;
    bool isDomainAnchor = false; // Starts with ||
    std::string pattern;
    PartyConstraint party = PARTY_ANY;
    int allowedTypes = 0; // Bitmask of ResourceType, 0 = all
};

class AdBlockEngine {
public:
    std::vector<FilterRule> networkRules;
    std::vector<FilterRule> exceptionRules;
    std::unordered_set<std::string> blockedDomains;
    std::unordered_set<std::string> exceptionDomains;

    // Cosmetic rules: key = host (empty string = global), value = list of CSS selectors
    std::unordered_map<std::string, std::vector<std::string>> cosmeticRules;

    void addRule(const std::string& line) {
        if (line.empty() || line[0] == '!' || line[0] == '[') {
            return; // Comment or metadata
        }

        // Cosmetic rules: domain##selector or ##selector
        size_t cosmeticPos = line.find("##");
        if (cosmeticPos != std::string::npos) {
            std::string domain = line.substr(0, cosmeticPos);
            std::string selector = line.substr(cosmeticPos + 2);
            if (!selector.empty()) {
                cosmeticRules[domain].push_back(selector);
            }
            return;
        }

        // Network rules
        std::string raw = line;
        bool isException = false;
        if (raw.rfind("@@", 0) == 0) {
            isException = true;
            raw = raw.substr(2);
        }

        FilterRule rule;
        rule.isException = isException;

        // Parse modifiers after $
        size_t optPos = raw.find('$');
        if (optPos != std::string::npos) {
            std::string opts = raw.substr(optPos + 1);
            raw = raw.substr(0, optPos);

            // Split options by comma
            size_t start = 0;
            size_t comma = 0;
            while ((comma = opts.find(',', start)) != std::string::npos) {
                applyModifier(rule, opts.substr(start, comma - start));
                start = comma + 1;
            }
            if (start < opts.length()) {
                applyModifier(rule, opts.substr(start));
            }
        }

        if (raw.rfind("||", 0) == 0) {
            rule.isDomainAnchor = true;
            std::string d = raw.substr(2);
            if (!d.empty() && d.back() == '^') {
                d.pop_back();
            }
            rule.pattern = d;
            if (rule.party == PARTY_ANY && rule.allowedTypes == 0) {
                if (isException) {
                    exceptionDomains.insert(d);
                } else {
                    blockedDomains.insert(d);
                }
            }
        } else {
            rule.pattern = raw;
        }

        if (isException) {
            exceptionRules.push_back(rule);
        } else {
            networkRules.push_back(rule);
        }
    }

    void compile() {
        LOGI("Engine compiled: %zu network rules, %zu exception rules, %zu fast domains, %zu cosmetic domains",
             networkRules.size(), exceptionRules.size(), blockedDomains.size(), cosmeticRules.size());
    }

    bool shouldBlock(const std::string& url, const std::string& host, const std::string& firstPartyHost, const std::string& resourceTypeStr, bool isThirdParty) const {
        // Never block actual video delivery streams or internal YouTube endpoints
        if (host.find("googlevideo.com") != std::string::npos ||
            host.find("youtube.com") != std::string::npos ||
            url.find("googlevideo.com") != std::string::npos ||
            url.find("youtube.com") != std::string::npos) {
            return false;
        }

        // Fast match known third-party ad networks
        if (url.find("googleads.g.doubleclick.net") != std::string::npos ||
            url.find("s0.2mdn.net") != std::string::npos ||
            url.find("static.doubleclick.net") != std::string::npos) {
            return true;
        }

        // 1. Fast domain check
        if (!blockedDomains.empty()) {
            std::string currentHost = host;
            while (!currentHost.empty()) {
                if (blockedDomains.find(currentHost) != blockedDomains.end()) {
                    // Check if host is in exception domains
                    if (exceptionDomains.find(currentHost) == exceptionDomains.end()) {
                        return true;
                    }
                }
                size_t dotPos = currentHost.find('.');
                if (dotPos != std::string::npos) {
                    currentHost = currentHost.substr(dotPos + 1);
                } else {
                    break;
                }
            }
        }

        ResourceType resType = parseResourceType(resourceTypeStr);

        // 2. Evaluate exception rules first (whitelists take precedence)
        for (const auto& rule : exceptionRules) {
            if (matchRule(rule, url, host, firstPartyHost, resType, isThirdParty)) {
                return false;
            }
        }

        // 3. Evaluate network blocking rules
        for (const auto& rule : networkRules) {
            if (matchRule(rule, url, host, firstPartyHost, resType, isThirdParty)) {
                return true;
            }
        }

        return false;
    }

    std::vector<std::string> getCosmeticRulesForHost(const std::string& host) const {
        std::vector<std::string> result;

        // Global cosmetic rules (##selector)
        auto globalIt = cosmeticRules.find("");
        if (globalIt != cosmeticRules.end()) {
            result.insert(result.end(), globalIt->second.begin(), globalIt->second.end());
        }

        // Host-specific cosmetic rules
        if (!host.empty()) {
            std::string current = host;
            while (!current.empty()) {
                auto hostIt = cosmeticRules.find(current);
                if (hostIt != cosmeticRules.end()) {
                    result.insert(result.end(), hostIt->second.begin(), hostIt->second.end());
                }
                size_t dot = current.find('.');
                if (dot != std::string::npos) {
                    current = current.substr(dot + 1);
                } else {
                    break;
                }
            }
        }

        return result;
    }

private:
    void applyModifier(FilterRule& rule, const std::string& mod) {
        if (mod == "third-party") {
            rule.party = PARTY_THIRD_ONLY;
        } else if (mod == "~third-party") {
            rule.party = PARTY_FIRST_ONLY;
        } else if (mod == "script") {
            rule.allowedTypes |= RES_SCRIPT;
        } else if (mod == "image") {
            rule.allowedTypes |= RES_IMAGE;
        } else if (mod == "stylesheet") {
            rule.allowedTypes |= RES_STYLESHEET;
        } else if (mod == "subdocument") {
            rule.allowedTypes |= RES_SUBDOCUMENT;
        } else if (mod == "xmlhttprequest") {
            rule.allowedTypes |= RES_XMLHTTPREQUEST;
        }
    }

    bool matchRule(const FilterRule& rule, const std::string& url, const std::string& host, const std::string& firstPartyHost, ResourceType resType, bool isThirdParty) const {
        // Party check
        if (rule.party == PARTY_THIRD_ONLY && !isThirdParty) return false;
        if (rule.party == PARTY_FIRST_ONLY && isThirdParty) return false;

        // Resource type check
        if (rule.allowedTypes != 0 && !(rule.allowedTypes & resType)) return false;

        // Pattern matching
        if (rule.isDomainAnchor) {
            size_t slashPos = rule.pattern.find('/');
            if (slashPos != std::string::npos) {
                std::string dom = rule.pattern.substr(0, slashPos);
                std::string path = rule.pattern.substr(slashPos);
                bool domMatch = (host == dom || (host.length() > dom.length() && host[host.length() - dom.length() - 1] == '.' && host.compare(host.length() - dom.length(), dom.length(), dom) == 0));
                return domMatch && url.find(path) != std::string::npos;
            }
            // Anchor ||domain: matches host or subdomains
            if (host == rule.pattern) return true;
            if (host.length() > rule.pattern.length()) {
                size_t diff = host.length() - rule.pattern.length();
                if (host[diff - 1] == '.' && host.compare(diff, rule.pattern.length(), rule.pattern) == 0) {
                    return true;
                }
            }
            return false;
        }

        // Substring / wildcard match
        return url.find(rule.pattern) != std::string::npos;
    }
};

} // namespace

extern "C" {

JNIEXPORT jlong JNICALL
Java_com_streamnest_app_adblock_BraveNativeEngine_nativeInit(JNIEnv* env, jobject thiz) {
    auto* engine = new AdBlockEngine();
    return reinterpret_cast<jlong>(engine);
}

JNIEXPORT jboolean JNICALL
Java_com_streamnest_app_adblock_BraveNativeEngine_nativeAddRule(JNIEnv* env, jobject thiz, jlong handle, jstring ruleStr) {
    if (!handle || !ruleStr) return JNI_FALSE;
    auto* engine = reinterpret_cast<AdBlockEngine*>(handle);
    const char* str = env->GetStringUTFChars(ruleStr, nullptr);
    if (str) {
        engine->addRule(std::string(str));
        env->ReleaseStringUTFChars(ruleStr, str);
        return JNI_TRUE;
    }
    return JNI_FALSE;
}

JNIEXPORT jboolean JNICALL
Java_com_streamnest_app_adblock_BraveNativeEngine_nativeCompileRules(JNIEnv* env, jobject thiz, jlong handle) {
    if (!handle) return JNI_FALSE;
    auto* engine = reinterpret_cast<AdBlockEngine*>(handle);
    engine->compile();
    return JNI_TRUE;
}

JNIEXPORT jboolean JNICALL
Java_com_streamnest_app_adblock_BraveNativeEngine_nativeShouldBlockUrl(
    JNIEnv* env,
    jobject thiz,
    jlong handle,
    jstring urlStr,
    jstring hostStr,
    jstring firstPartyHostStr,
    jstring resourceTypeStr,
    jboolean isThirdParty) {
    if (!handle || !urlStr) return JNI_FALSE;
    auto* engine = reinterpret_cast<AdBlockEngine*>(handle);

    const char* url = env->GetStringUTFChars(urlStr, nullptr);
    const char* host = hostStr ? env->GetStringUTFChars(hostStr, nullptr) : "";
    const char* firstPartyHost = firstPartyHostStr ? env->GetStringUTFChars(firstPartyHostStr, nullptr) : "";
    const char* resType = resourceTypeStr ? env->GetStringUTFChars(resourceTypeStr, nullptr) : "";

    bool blocked = engine->shouldBlock(
        url ? std::string(url) : "",
        host ? std::string(host) : "",
        firstPartyHost ? std::string(firstPartyHost) : "",
        resType ? std::string(resType) : "",
        isThirdParty == JNI_TRUE
    );

    if (url) env->ReleaseStringUTFChars(urlStr, url);
    if (hostStr && host) env->ReleaseStringUTFChars(hostStr, host);
    if (firstPartyHostStr && firstPartyHost) env->ReleaseStringUTFChars(firstPartyHostStr, firstPartyHost);
    if (resourceTypeStr && resType) env->ReleaseStringUTFChars(resourceTypeStr, resType);

    return blocked ? JNI_TRUE : JNI_FALSE;
}

JNIEXPORT jobjectArray JNICALL
Java_com_streamnest_app_adblock_BraveNativeEngine_nativeGetCosmeticRules(
    JNIEnv* env,
    jobject thiz,
    jlong handle,
    jstring hostStr) {
    if (!handle) return nullptr;
    auto* engine = reinterpret_cast<AdBlockEngine*>(handle);

    const char* host = hostStr ? env->GetStringUTFChars(hostStr, nullptr) : "";
    std::vector<std::string> rules = engine->getCosmeticRulesForHost(host ? std::string(host) : "");
    if (hostStr && host) env->ReleaseStringUTFChars(hostStr, host);

    jclass stringClass = env->FindClass("java/lang/String");
    jobjectArray result = env->NewObjectArray(static_cast<jsize>(rules.size()), stringClass, nullptr);
    for (size_t i = 0; i < rules.size(); ++i) {
        jstring rule = env->NewStringUTF(rules[i].c_str());
        env->SetObjectArrayElement(result, static_cast<jsize>(i), rule);
        env->DeleteLocalRef(rule);
    }
    return result;
}

JNIEXPORT void JNICALL
Java_com_streamnest_app_adblock_BraveNativeEngine_nativeDestroy(JNIEnv* env, jobject thiz, jlong handle) {
    if (handle) {
        auto* engine = reinterpret_cast<AdBlockEngine*>(handle);
        delete engine;
    }
}

} // extern "C"
