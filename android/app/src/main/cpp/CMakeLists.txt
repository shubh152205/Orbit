cmake_minimum_required(VERSION 3.10.2)

project("brave_shields_jni")

add_library(
    brave_shields_jni
    SHARED
    brave_shields_jni.cpp
)

find_library(
    log-lib
    log
)

target_link_libraries(
    brave_shields_jni
    ${log-lib}
)
