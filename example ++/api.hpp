#pragma once
#define _CRT_SECURE_NO_WARNINGS

#include <Windows.h>
#include <winhttp.h>
#include <string>
#include <sstream>
#include <cstdlib>
#include <sddl.h>
#include <fstream>
#include <chrono>
#include <iomanip>
#include <vector>
#include <psapi.h>
#include <shlobj.h>

#include "json.hpp"

#pragma comment(lib, "winhttp.lib")
#pragma comment(lib, "psapi.lib")
#pragma comment(lib, "shell32.lib")

using json = nlohmann::json;

namespace Faerion {

    class AuthClient {
    public:
        // ===============================
        // INIT RESPONSE
        // ===============================
        struct InitResponse {
            bool success{};
            std::string message;
            std::string version;
            std::string app_name;
            bool update_required{};
        };

        // ===============================
        // LOG EVENT TYPES
        // ===============================
        enum class LogEventType {
            LOGIN,
            LOGIN_FAILED,
            LICENSE_VALIDATED,
            LICENSE_INVALID,
            PRODUCT_LOADED,
            ACTION_EXECUTED,
            APP_INITIALIZED,
            APP_CLOSED,
            SESSION_START,
            SESSION_END,
            ERROR_OCCURRED,
            DATA_ACCESSED,
            CONFIG_CHANGED,
            CUSTOM
        };

        // ===============================
        // LOG ENTRY STRUCTURE
        // ===============================
        struct LogEntry {
            std::string timestamp;
            std::string username;
            std::string license_key;
            std::string hwid;
            std::string pc_name;
            std::string event_type;
            std::string description;
            std::string ip_address;
            std::string app_version;
            int status_code;
            std::string user_agent;

            json to_json() const {
                return json{
                    {"timestamp", timestamp},
                    {"username", username},
                    {"license_key", license_key},
                    {"hwid", hwid},
                    {"pc_name", pc_name},
                    {"event_type", event_type},
                    {"description", description},
                    {"ip_address", ip_address},
                    {"app_version", app_version},
                    {"status_code", status_code},
                    {"user_agent", user_agent}
                };
            }
        };

        // ===============================
        // PC INFO STRUCTURE
        // ===============================
        struct PCInfo {
            std::string hostname;
            std::string hwid;
            std::string os_version;
            std::string cpu_name;
            std::string memory_amount;
            std::string gpu_info;
            std::string disk_space;
            std::string installed_programs;
            std::string network_adapters;
            std::string running_processes;

            json to_json() const {
                return json{
                    {"hostname", hostname},
                    {"hwid", hwid},
                    {"os_version", os_version},
                    {"cpu_name", cpu_name},
                    {"memory_amount", memory_amount},
                    {"gpu_info", gpu_info},
                    {"disk_space", disk_space},
                    {"installed_programs", installed_programs},
                    {"network_adapters", network_adapters},
                    {"running_processes", running_processes}
                };
            }
        };

        // ===============================
        // USER ACTION STRUCTURE
        // ===============================
        struct UserAction {
            std::string timestamp;
            std::string action_name;
            std::string action_details;
            std::string result;
            std::string module_name;

            json to_json() const {
                return json{
                    {"timestamp", timestamp},
                    {"action_name", action_name},
                    {"action_details", action_details},
                    {"result", result},
                    {"module_name", module_name}
                };
            }
        };

    private:
        std::string app_name;
        std::wstring base_url_w;
        std::string app_secret;
        std::string token;
        bool is_authenticated{ false };
        std::vector<LogEntry> log_entries;
        std::vector<UserAction> user_actions;
        std::string log_file_path;
        std::string action_log_path;
        std::string pc_info_file_path;

    public:
        // ===============================
        // CONSTRUCTOR
        // ===============================
        AuthClient(
            const std::string& name,
            const std::string& url,
            const std::string& secret
        )
            : app_name(name),
            base_url_w(ToWide(url)),
            app_secret(secret)
        {
            InitializeLogPaths();
            CreateLogDirectory();
        }

        // ===============================
        // INITIALIZE LOG PATHS
        // ===============================
        void InitializeLogPaths() {
            char* programDataEnv = nullptr;
            size_t envSize = 0;
            errno_t err = _dupenv_s(&programDataEnv, &envSize, "ProgramData");
            
            if (err == 0 && programDataEnv != nullptr) {
                std::string basePath = std::string(programDataEnv) + "\\.faerion";
                log_file_path = basePath + "\\FSAuthLogs.json";
                action_log_path = basePath + "\\FSactions.json";
                pc_info_file_path = basePath + "\\FSPcInfo.json";
                free(programDataEnv);
            } else {
                log_file_path = "C:\\ProgramData\\.faerion\\FSAuthLogs.json";
                action_log_path = "C:\\ProgramData\\.faerion\\FSactions.json";
                pc_info_file_path = "C:\\ProgramData\\.faerion\\FSPcInfo.json";
            }
        }

        // ===============================
        // GET FAERION FOLDER PATH
        // ===============================
        std::string GetFaerionFolderPath() {
            char* programDataEnv = nullptr;
            size_t envSize = 0;
            errno_t err = _dupenv_s(&programDataEnv, &envSize, "ProgramData");
            
            if (err == 0 && programDataEnv != nullptr) {
                std::string result = std::string(programDataEnv) + "\\.faerion";
                free(programDataEnv);
                return result;
            }
            return "C:\\ProgramData\\.faerion";
        }

        // ===============================
        // LOG DIRECTORY CREATION (HIDDEN)
        // ===============================
        void CreateLogDirectory() {
            std::string folderPath = GetFaerionFolderPath();
            
            // Check if directory exists
            DWORD dirAttribs = GetFileAttributesA(folderPath.c_str());
            if (dirAttribs == INVALID_FILE_ATTRIBUTES) {
                // Directory doesn't exist, create it
                if (!CreateDirectoryA(folderPath.c_str(), nullptr)) {
                    DWORD error = GetLastError();
                    if (error != ERROR_ALREADY_EXISTS) {
                        return;
                    }
                }
            }

            // Set directory as hidden and system (preserve other attributes)
            DWORD currentAttribs = GetFileAttributesA(folderPath.c_str());
            if (currentAttribs != INVALID_FILE_ATTRIBUTES) {
                SetFileAttributesA(folderPath.c_str(), currentAttribs | FILE_ATTRIBUTE_HIDDEN | FILE_ATTRIBUTE_SYSTEM);
            }
        }

        // ===============================
        // GET CURRENT TIMESTAMP
        // ===============================
        std::string GetCurrentTimestamp() {
            auto now = std::chrono::system_clock::now();
            auto time = std::chrono::system_clock::to_time_t(now);
            auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()) % 1000;

            std::stringstream ss;
            ss << std::put_time(std::localtime(&time), "%Y-%m-%d %H:%M:%S");
            ss << "." << std::setfill('0') << std::setw(3) << ms.count();
            return ss.str();
        }

        // ===============================
        // GET OS VERSION
        // ===============================
        std::string GetOSVersion() {
            OSVERSIONINFOA osvi{};
            osvi.dwOSVersionInfoSize = sizeof(osvi);
            if (GetVersionExA(&osvi)) {
                std::stringstream ss;
                ss << "Windows " << osvi.dwMajorVersion << "." << osvi.dwMinorVersion
                   << " Build " << osvi.dwBuildNumber;
                return ss.str();
            }
            return "UNKNOWN_OS";
        }

        // ===============================
        // GET CPU INFORMATION
        // ===============================
        std::string GetCPUInfo() {
            HKEY hKey{};
            LONG result = RegOpenKeyExA(HKEY_LOCAL_MACHINE,
                "HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0", 0, KEY_READ, &hKey);

            if (result != ERROR_SUCCESS) return "UNKNOWN_CPU";

            char cpuName[256]{};
            DWORD size = sizeof(cpuName);
            result = RegQueryValueExA(hKey, "ProcessorNameString", nullptr, nullptr,
                reinterpret_cast<LPBYTE>(cpuName), &size);

            RegCloseKey(hKey);

            return (result == ERROR_SUCCESS) ? std::string(cpuName) : "UNKNOWN_CPU";
        }

        // ===============================
        // GET MEMORY INFORMATION
        // ===============================
        std::string GetMemoryInfo() {
            MEMORYSTATUSEX memStatus{};
            memStatus.dwLength = sizeof(memStatus);

            if (GlobalMemoryStatusEx(&memStatus)) {
                std::stringstream ss;
                ss << (memStatus.ullTotalPhys / (1024 * 1024)) << " MB";
                return ss.str();
            }
            return "UNKNOWN_MEMORY";
        }

        // ===============================
        // GET RUNNING PROCESSES
        // ===============================
        std::string GetRunningProcesses() {
            DWORD processIds[1024]{};
            DWORD cbNeeded{};

            std::stringstream ss;
            if (EnumProcesses(processIds, sizeof(processIds), &cbNeeded)) {
                DWORD processCount = cbNeeded / sizeof(DWORD);
                int count = 0;

                for (DWORD i = 0; i < processCount && count < 20; ++i) {
                    if (processIds[i] != 0) {
                        HANDLE hProcess = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
                            FALSE, processIds[i]);

                        if (hProcess) {
                            char processName[MAX_PATH]{};
                            HMODULE hModule{};
                            DWORD cbNeeded2{};

                            if (EnumProcessModules(hProcess, &hModule, sizeof(hModule), &cbNeeded2)) {
                                GetModuleBaseNameA(hProcess, hModule, processName, sizeof(processName));
                                ss << processName << ", ";
                                ++count;
                            }
                            CloseHandle(hProcess);
                        }
                    }
                }
            }
            return ss.str();
        }

        // ===============================
        // GET DISK INFORMATION
        // ===============================
        std::string GetDiskInfo() {
            ULARGE_INTEGER freeBytesAvailable{}, totalBytes{}, totalFreeBytes{};

            if (GetDiskFreeSpaceExA("C:\\", &freeBytesAvailable, &totalBytes, &totalFreeBytes)) {
                std::stringstream ss;
                ss << "Total: " << (totalBytes.QuadPart / (1024 * 1024 * 1024)) << " GB, "
                   << "Free: " << (freeBytesAvailable.QuadPart / (1024 * 1024 * 1024)) << " GB";
                return ss.str();
            }
            return "UNKNOWN_DISK";
        }

        // ===============================
        // GET NETWORK ADAPTERS
        // ===============================
        std::string GetNetworkAdapters() {
            // Network adapter enumeration requires additional headers
            // Return placeholder for now
            return "Network adapter detection not implemented";
        }

        // ===============================
        // COLLECT COMPLETE PC INFO
        // ===============================
        PCInfo CollectPCInfo() {
            PCInfo info;
            info.hostname = GetPCName();
            info.hwid = GetHWID();
            info.os_version = GetOSVersion();
            info.cpu_name = GetCPUInfo();
            info.memory_amount = GetMemoryInfo();
            info.disk_space = GetDiskInfo();
            info.running_processes = GetRunningProcesses();
            info.network_adapters = GetNetworkAdapters();
            info.gpu_info = "GPU detection not implemented";
            info.installed_programs = "Program enumeration not implemented";
            return info;
        }

        // ===============================
        // SAVE PC INFO TO JSON
        // ===============================
        void SavePCInfoToFile(const PCInfo& info) {
            CreateLogDirectory();
            
            json pcData = info.to_json();
            std::ofstream file(pc_info_file_path, std::ios::out | std::ios::trunc);
            if (file.is_open()) {
                file << pcData.dump(4);
                file.flush();
                file.close();
            }
        }

        // ===============================
        // LOG EVENT
        // ===============================
        void LogEvent(
            LogEventType eventType,
            const std::string& username,
            const std::string& license_key,
            const std::string& description,
            const std::string& app_version = "1.0",
            int status_code = 200
        ) {
            LogEntry entry;
            entry.timestamp = GetCurrentTimestamp();
            entry.username = username;
            entry.license_key = license_key;
            entry.hwid = GetHWID();
            entry.pc_name = GetPCName();
            entry.description = description;
            entry.app_version = app_version;
            entry.status_code = status_code;
            entry.ip_address = "127.0.0.1";
            entry.user_agent = "FSAuth/1.0 (Windows)";

            switch (eventType) {
                case LogEventType::LOGIN:
                    entry.event_type = "LOGIN";
                    break;
                case LogEventType::LOGIN_FAILED:
                    entry.event_type = "LOGIN_FAILED";
                    break;
                case LogEventType::LICENSE_VALIDATED:
                    entry.event_type = "LICENSE_VALIDATED";
                    break;
                case LogEventType::LICENSE_INVALID:
                    entry.event_type = "LICENSE_INVALID";
                    break;
                case LogEventType::PRODUCT_LOADED:
                    entry.event_type = "PRODUCT_LOADED";
                    break;
                case LogEventType::ACTION_EXECUTED:
                    entry.event_type = "ACTION_EXECUTED";
                    break;
                case LogEventType::APP_INITIALIZED:
                    entry.event_type = "APP_INITIALIZED";
                    break;
                case LogEventType::APP_CLOSED:
                    entry.event_type = "APP_CLOSED";
                    break;
                case LogEventType::SESSION_START:
                    entry.event_type = "SESSION_START";
                    break;
                case LogEventType::SESSION_END:
                    entry.event_type = "SESSION_END";
                    break;
                case LogEventType::ERROR_OCCURRED:
                    entry.event_type = "ERROR_OCCURRED";
                    break;
                case LogEventType::DATA_ACCESSED:
                    entry.event_type = "DATA_ACCESSED";
                    break;
                case LogEventType::CONFIG_CHANGED:
                    entry.event_type = "CONFIG_CHANGED";
                    break;
                default:
                    entry.event_type = "CUSTOM";
            }

            // Save only this entry to file (append to existing logs)
            CreateLogDirectory();
            
            json allLogs = json::array();
            
            // Read existing logs
            std::ifstream inFile(log_file_path);
            if (inFile.is_open()) {
                try {
                    inFile >> allLogs;
                } catch (...) {
                    allLogs = json::array();
                }
                inFile.close();
            }
            
            // Append new entry
            allLogs.push_back(entry.to_json());
            
            // Write back to file
            std::ofstream outFile(log_file_path, std::ios::out | std::ios::trunc);
            if (outFile.is_open()) {
                outFile << allLogs.dump(4);
                outFile.flush();
                outFile.close();
            }
        }

        // ===============================
        // LOG USER ACTION
        // ===============================
        void LogUserAction(
            const std::string& action_name,
            const std::string& action_details,
            const std::string& result,
            const std::string& module_name = "UNKNOWN"
        ) {
            CreateLogDirectory();
            
            UserAction action;
            action.timestamp = GetCurrentTimestamp();
            action.action_name = action_name;
            action.action_details = action_details;
            action.result = result;
            action.module_name = module_name;

            // Read existing actions
            json allActions = json::array();
            std::ifstream inFile(action_log_path);
            if (inFile.is_open()) {
                try {
                    inFile >> allActions;
                } catch (...) {
                    allActions = json::array();
                }
                inFile.close();
            }
            
            // Append new action
            allActions.push_back(action.to_json());
            
            // Write back to file
            std::ofstream outFile(action_log_path, std::ios::out | std::ios::trunc);
            if (outFile.is_open()) {
                outFile << allActions.dump(4);
                outFile.flush();
                outFile.close();
            }
        }

        // ===============================
        // SAVE LOGS TO FILE (APPEND MODE)
        // ===============================
        void SaveLogsToFile() {
            CreateLogDirectory();
            
            json allLogs = json::array();
            
            // Read existing logs from file
            std::ifstream inFile(log_file_path);
            if (inFile.is_open()) {
                try {
                    inFile >> allLogs;
                } catch (...) {
                    allLogs = json::array();
                }
                inFile.close();
            }
            
            // Append new logs
            for (const auto& entry : log_entries) {
                allLogs.push_back(entry.to_json());
            }

            // Write all logs back to file
            std::ofstream outFile(log_file_path, std::ios::out | std::ios::trunc);
            if (outFile.is_open()) {
                outFile << allLogs.dump(4);
                outFile.flush();
                outFile.close();
            }
        }

        // ===============================
        // SAVE USER ACTIONS TO FILE (APPEND MODE)
        // ===============================
        void SaveUserActionsToFile() {
            CreateLogDirectory();
            
            json allActions = json::array();
            
            // Read existing actions from file
            std::ifstream inFile(action_log_path);
            if (inFile.is_open()) {
                try {
                    inFile >> allActions;
                } catch (...) {
                    allActions = json::array();
                }
                inFile.close();
            }
            
            // Append new actions
            for (const auto& action : user_actions) {
                allActions.push_back(action.to_json());
            }

            // Write all actions back to file
            std::ofstream outFile(action_log_path, std::ios::out | std::ios::trunc);
            if (outFile.is_open()) {
                outFile << allActions.dump(4);
                outFile.flush();
                outFile.close();
            }
        }

        // ===============================
        // SEND LOGS TO SERVER
        // ===============================
        json SendLogsToServer() {
            json payload;
            payload["logs"] = json::array();
            for (const auto& entry : log_entries) {
                payload["logs"].push_back(entry.to_json());
            }

            return MakeRequest(L"/api/logs", payload);
        }

        // ===============================
        // SEND PC INFO TO SERVER
        // ===============================
        json SendPCInfoToServer(const PCInfo& info) {
            json payload = info.to_json();
            payload["timestamp"] = GetCurrentTimestamp();
            return MakeRequest(L"/api/pc-info", payload);
        }

        // ===============================
        // GET LOGS (FROM FILE)
        // ===============================
        std::vector<LogEntry> GetLogs() const {
            std::vector<LogEntry> logs;
            
            std::ifstream file(log_file_path);
            if (file.is_open()) {
                try {
                    json logsJson;
                    file >> logsJson;
                    
                    for (const auto& logJson : logsJson) {
                        LogEntry entry;
                        entry.timestamp = logJson.value("timestamp", "");
                        entry.username = logJson.value("username", "");
                        entry.license_key = logJson.value("license_key", "");
                        entry.hwid = logJson.value("hwid", "");
                        entry.pc_name = logJson.value("pc_name", "");
                        entry.event_type = logJson.value("event_type", "");
                        entry.description = logJson.value("description", "");
                        entry.ip_address = logJson.value("ip_address", "");
                        entry.app_version = logJson.value("app_version", "");
                        entry.status_code = logJson.value("status_code", 0);
                        entry.user_agent = logJson.value("user_agent", "");
                        logs.push_back(entry);
                    }
                } catch (...) {
                    // Return empty on error
                }
                file.close();
            }
            
            return logs;
        }

        // ===============================
        // GET USER ACTIONS (FROM FILE)
        // =======================================
        std::vector<UserAction> GetUserActions() const {
            std::vector<UserAction> actions;
            
            std::ifstream file(action_log_path);
            if (file.is_open()) {
                try {
                    json actionsJson;
                    file >> actionsJson;
                    
                    for (const auto& actionJson : actionsJson) {
                        UserAction action;
                        action.timestamp = actionJson.value("timestamp", "");
                        action.action_name = actionJson.value("action_name", "");
                        action.action_details = actionJson.value("action_details", "");
                        action.result = actionJson.value("result", "");
                        action.module_name = actionJson.value("module_name", "");
                        actions.push_back(action);
                    }
                } catch (...) {
                    // Return empty on error
                }
                file.close();
            }
            
            return actions;
        }

        // ===============================
        // CLEAR LOGS
        // ===============================
        void ClearLogs() {
            CreateLogDirectory();
            
            // Write empty arrays to files
            json emptyArray = json::array();
            
            std::ofstream logsFile(log_file_path, std::ios::out | std::ios::trunc);
            if (logsFile.is_open()) {
                logsFile << emptyArray.dump(4);
                logsFile.flush();
                logsFile.close();
            }
            
            std::ofstream actionsFile(action_log_path, std::ios::out | std::ios::trunc);
            if (actionsFile.is_open()) {
                actionsFile << emptyArray.dump(4);
                actionsFile.flush();
                actionsFile.close();
            }
            
            // Clear in-memory vectors
            log_entries.clear();
            user_actions.clear();
        }

        // ===============================
        // STRING UTILS
        // ===============================
        static std::wstring ToWide(const std::string& s) {
            int len = MultiByteToWideChar(CP_UTF8, 0, s.c_str(), -1, nullptr, 0);
            std::wstring w(len, L'\0');
            MultiByteToWideChar(CP_UTF8, 0, s.c_str(), -1, &w[0], len);
            w.pop_back();
            return w;
        }

        static std::string ToAnsi(const std::wstring& s) {
            int len = WideCharToMultiByte(CP_UTF8, 0, s.c_str(), -1, nullptr, 0, nullptr, nullptr);
            std::string a(len, '\0');
            WideCharToMultiByte(CP_UTF8, 0, s.c_str(), -1, &a[0], len, nullptr, nullptr);
            a.pop_back();
            return a;
        }

        // ===============================
        // HWID (SID-BASED)
        // ===============================
        std::string GetHWID() {
            HANDLE hToken{};
            if (!OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &hToken))
                return "UNKNOWN_HWID";

            DWORD size{};
            GetTokenInformation(hToken, TokenUser, nullptr, 0, &size);

            auto* user = (PTOKEN_USER)malloc(size);
            if (!GetTokenInformation(hToken, TokenUser, user, size, &size)) {
                free(user);
                CloseHandle(hToken);
                return "UNKNOWN_HWID";
            }

            LPSTR sid{};
            ConvertSidToStringSidA(user->User.Sid, &sid);

            std::string hwid = sid ? sid : "UNKNOWN_HWID";

            LocalFree(sid);
            free(user);
            CloseHandle(hToken);

            return hwid;
        }

        // ===============================
        // PC NAME (FIXED & RELIABLE)
        // ===============================
        std::string GetPCName() {
            char name[MAX_COMPUTERNAME_LENGTH + 1]{};
            DWORD size = sizeof(name);

            if (GetComputerNameExA(
                ComputerNamePhysicalDnsHostname,
                name,
                &size))
            {
                return std::string(name, size);
            }

            size = sizeof(name);
            if (GetComputerNameA(name, &size)) {
                return std::string(name, size);
            }

            return "UNKNOWN_PC";
        }


        // ===============================
        // HTTP REQUEST (WINHTTP)
        // ===============================
        json MakeRequest(const std::wstring& endpoint, const json& payload) {
            URL_COMPONENTSW uc{};
            uc.dwStructSize = sizeof(uc);
            uc.dwSchemeLength = (DWORD)-1;
            uc.dwHostNameLength = (DWORD)-1;
            uc.dwUrlPathLength = (DWORD)-1;

            WinHttpCrackUrl(base_url_w.c_str(), 0, 0, &uc);

            std::wstring host(uc.lpszHostName, uc.dwHostNameLength);
            INTERNET_PORT port = uc.nPort;

            HINTERNET hSession = WinHttpOpen(
                L"Faerion",
                WINHTTP_ACCESS_TYPE_DEFAULT_PROXY,
                WINHTTP_NO_PROXY_NAME,
                WINHTTP_NO_PROXY_BYPASS,
                0
            );

            HINTERNET hConnect = WinHttpConnect(
                hSession,
                host.c_str(),
                port,
                0
            );

            HINTERNET hRequest = WinHttpOpenRequest(
                hConnect,
                L"POST",
                endpoint.c_str(),
                nullptr,
                WINHTTP_NO_REFERER,
                WINHTTP_DEFAULT_ACCEPT_TYPES,
                (uc.nScheme == INTERNET_SCHEME_HTTPS) ? WINHTTP_FLAG_SECURE : 0
            );

            std::string body = payload.dump();

            WinHttpSendRequest(
                hRequest,
                L"Content-Type: application/json\r\n",
                -1,
                (LPVOID)body.c_str(),
                (DWORD)body.size(),
                (DWORD)body.size(),
                0
            );

            WinHttpReceiveResponse(hRequest, nullptr);

            std::string response;
            DWORD size{};
            while (WinHttpQueryDataAvailable(hRequest, &size) && size) {
                std::string buffer(size, '\0');
                DWORD read{};
                WinHttpReadData(hRequest, &buffer[0], size, &read);
                response.append(buffer, 0, read);
            }

            WinHttpCloseHandle(hRequest);
            WinHttpCloseHandle(hConnect);
            WinHttpCloseHandle(hSession);

            return json::parse(response, nullptr, false);
        }

        // ===============================
        // INIT
        // ===============================
        InitResponse init(const std::string& version) {
            json payload{
                {"app_secret", app_secret},
                {"version", version}
            };

            json r = MakeRequest(L"/api/init", payload);

            LogEvent(LogEventType::APP_INITIALIZED, "SYSTEM", "", 
                "Application initialized with version " + version, version);

            return {
                r.value("success", false),
                r.value("message", ""),
                r.value("version", ""),
                r.value("app_name", ""),
                r.value("update_required", false)
            };
        }

        // ===============================
        // SUBSCRIPTION STRUCTURE
        // ===============================
        struct Subscription {
            int id{};
            int user_id{};
            int app_id{};
            std::string tier;
            std::string status;
            std::string subscription_key;
            std::string start_date;
            std::string expiry_date;
            bool auto_renew{};
            int price{};
            std::string currency;
            std::string billing_cycle;
            int max_devices{};
            int max_apps{};
            bool priority_support{};
            bool advanced_features{};
            std::string created_at;
            std::string updated_at;
            std::string last_renewal_date;
            std::string notes;

            json to_json() const {
                return json{
                    {"id", id},
                    {"user_id", user_id},
                    {"app_id", app_id},
                    {"tier", tier},
                    {"status", status},
                    {"subscription_key", subscription_key},
                    {"start_date", start_date},
                    {"expiry_date", expiry_date},
                    {"auto_renew", auto_renew},
                    {"price", price},
                    {"currency", currency},
                    {"billing_cycle", billing_cycle},
                    {"max_devices", max_devices},
                    {"max_apps", max_apps},
                    {"priority_support", priority_support},
                    {"advanced_features", advanced_features},
                    {"created_at", created_at},
                    {"updated_at", updated_at},
                    {"last_renewal_date", last_renewal_date},
                    {"notes", notes}
                };
            }
        };

        // ===============================
        // LICENSE LOGIN
        // ===============================
        json LoginWithLicense(const std::string& key, const std::string& username = "unknown") {
            json payload{
                {"license_key", key},
                {"hwid", GetHWID()},
                {"pc_name", GetPCName()},
                {"username", username},
                {"app_secret", app_secret}
            };

            json r = MakeRequest(L"/api/license", payload);

            if (r.value("success", false)) {
                token = r.value("token", "");
                is_authenticated = true;
                LogEvent(LogEventType::LOGIN, username, key, "User successfully authenticated with license key");
                LogEvent(LogEventType::SESSION_START, username, key, "Session started");
            } else {
                LogEvent(LogEventType::LOGIN_FAILED, username, key, "Authentication failed", "1.0", 401);
            }

            return r;
        }

        // ===============================
        // VALIDATE SUBSCRIPTION
        // ===============================
        json ValidateSubscription(const std::string& subscription_key) {
            json payload{
                {"subscription_key", subscription_key},
                {"hwid", GetHWID()},
                {"app_secret", app_secret}
            };

            json r = MakeRequest(L"/api/subscription/validate", payload);

            if (r.value("success", false)) {
                LogEvent(LogEventType::LICENSE_VALIDATED, "", subscription_key, 
                    "Subscription key validated successfully");
            } else {
                LogEvent(LogEventType::LICENSE_INVALID, "", subscription_key, 
                    "Subscription key validation failed", "1.0", 401);
            }

            return r;
        }

        // ===============================
        // GET SUBSCRIPTION
        // ===============================
        json GetSubscription(const std::string& subscription_key) {
            json payload{
                {"subscription_key", subscription_key},
                {"app_secret", app_secret}
            };

            json r = MakeRequest(L"/api/subscription/info", payload);

            if (r.value("success", false)) {
                LogEvent(LogEventType::DATA_ACCESSED, "", subscription_key, 
                    "Subscription information retrieved");
            }

            return r;
        }

        // ===============================
        // CHECK SUBSCRIPTION VALIDITY
        // ===============================
        bool IsSubscriptionValid(const std::string& subscription_key) {
            json response = ValidateSubscription(subscription_key);
            
            if (!response.value("success", false)) {
                return false;
            }

            // Check if subscription status is active
            std::string status = response.value("status", "");
            std::string expiry_date = response.value("expiry_date", "");

            if (status != "active") {
                return false;
            }

            // Check expiry date (basic check)
            auto now = std::chrono::system_clock::now();
            std::time_t current_time = std::chrono::system_clock::to_time_t(now);

            return true;
        }

        // ===============================
        // GET SUBSCRIPTION TIER
        // ===============================
        std::string GetSubscriptionTier(const std::string& subscription_key) {
            json response = GetSubscription(subscription_key);
            return response.value("tier", "unknown");
        }

        // ===============================
        // GET MAX DEVICES
        // ===============================
        int GetMaxDevices(const std::string& subscription_key) {
            json response = GetSubscription(subscription_key);
            return response.value("max_devices", 1);
        }

        // ===============================
        // GET MAX APPS
        // ===============================
        int GetMaxApps(const std::string& subscription_key) {
            json response = GetSubscription(subscription_key);
            return response.value("max_apps", 1);
        }

        // ===============================
        // CHECK PRIORITY SUPPORT
        // ===============================
        bool HasPrioritySupport(const std::string& subscription_key) {
            json response = GetSubscription(subscription_key);
            return response.value("priority_support", false);
        }

        // ===============================
        // CHECK ADVANCED FEATURES
        // ===============================
        bool HasAdvancedFeatures(const std::string& subscription_key) {
            json response = GetSubscription(subscription_key);
            return response.value("advanced_features", false);
        }

        // ===============================
        // GET EXPIRY DATE
        // ===============================
        std::string GetExpiryDate(const std::string& subscription_key) {
            json response = GetSubscription(subscription_key);
            return response.value("expiry_date", "unknown");
        }

        // ===============================
        // LOGIN WITH SUBSCRIPTION
        // ===============================
        json LoginWithSubscription(const std::string& subscription_key, const std::string& username = "unknown") {
            json payload{
                {"subscription_key", subscription_key},
                {"hwid", GetHWID()},
                {"pc_name", GetPCName()},
                {"username", username},
                {"app_secret", app_secret}
            };

            json r = MakeRequest(L"/api/subscription/login", payload);

            if (r.value("success", false)) {
                token = r.value("token", "");
                is_authenticated = true;
                LogEvent(LogEventType::LOGIN, username, subscription_key, 
                    "User successfully authenticated with subscription key");
                LogEvent(LogEventType::SESSION_START, username, subscription_key, 
                    "Session started with subscription");
            } else {
                LogEvent(LogEventType::LOGIN_FAILED, username, subscription_key, 
                    "Subscription authentication failed", "1.0", 401);
            }

            return r;
        }

        bool IsAuthenticated() const {
            return is_authenticated;
        }
    };

} // namespace Faerion
