import re
from typing import Tuple, List


# unused
def is_upper_case_adjacent(s):
    s = s.split(" ")
    s = list(filter(lambda x: not re.match(r"[^A-Za-zäöüÄÖÜß]", x), s))
    for i in range(len(s) - 1):
        if s[i].isupper() and s[i + 1].isupper():
            return True
    return False


def string_similarity(
    str1: str, str2: str, substring_length: int = 2, case_sensitive: bool = False
) -> float:
    """
    Calculate similarity between two strings using
    https://en.wikipedia.org/wiki/S%C3%B8rensen%E2%80%93Dice_coefficient
    Computing time O(n)
    :param str1: First string to match
    :param str2: Second string to match
    :param substring_length: Optional. Length of substring to be used in calculating similarity. Default 2.
    :param case_sensitive: Optional. Whether you want to consider case in string matching. Default false;
    :return: Number between 0 and 1, with 0 being a low match score.
    """
    if not case_sensitive:
        str1 = str1.lower()
        str2 = str2.lower()

    if len(str1) < substring_length or len(str2) < substring_length:
        return 0

    m = {}
    for i in range(len(str1) - (substring_length - 1)):
        substr1 = str1[i : substring_length + i]
        m[substr1] = m.get(substr1, 0) + 1

    match = 0
    for j in range(len(str2) - (substring_length - 1)):
        substr2 = str2[j : substring_length + j]
        count = m.get(substr2, 0)

        if count > 0:
            match += 1
            m[substr2] = count - 1

    return (match * 2) / (len(str1) + len(str2) - ((substring_length - 1) * 2))


def group_by_similarity(
    sentences: List[str], threshold: float = 0.75
) -> List[List[str]]:
    """
    This is a function that takes a list of sentences
    and create groups of similarity and return them
    Complexity:
    Compute: O(n^2)
    :param sentences: The list of sentences to check.
    :type sentences: List[str]
    :param threshold: The threshold to consider similarity. Default 0.75.
    :type threshold: float, optional
    :return: Clusters of sentences.
    """
    groups = []
    # TODO: should ignore empty strings or option to ignore len < X
    for i in range(len(sentences)):
        sentence = sentences[i]
        is_in_group = False
        for j in range(len(groups)):
            group = groups[j]
            if len(group) == 0:
                continue
            similarity = sum([string_similarity(cur, sentence) for cur in group]) / len(
                group
            )
            if similarity >= threshold:
                is_in_group = True
                group.append(sentence)
        if not is_in_group:
            groups.append([sentence])
    return groups


def group_by_similarity_distinct(sentences: List[str], threshold: float = 0.75) -> map:
    """
    Given a list of sentences, group them by similarity,
    filter groups of size 2 or more,
    flatten the list by taking the shortest sentence in the groups
    :param sentences:
    :param threshold:
    :return:
    """
    groups = group_by_similarity(sentences, threshold)
    f = filter(lambda group: len(group) > 1, groups)
    m = map(lambda group: min(group, key=len), f)
    return m
