"""Offline Korean spelling -> pronunciation (g2pkk), without MeCab or the English dictionary (all phrases here are Korean)."""
import nltk
class _C:
    def dict(self): return {}
nltk.corpus.cmudict = _C()
import g2pkk.g2pkk as gg
gg.annotate = lambda string, mecab: string   # skip the grammar tags: the sound rules still apply
from g2pkk import G2p
_g = G2p()
def _word_pron(s):
    # word by word: the sound rules inside a word (감사합니다 -> 감사함니다), not across the spaces between words
    return ' '.join(_g(w) for w in s.split(' ') if w)

# Two rules across the space that the word-by-word pass misses, both standard pronunciation:
# after the -(으)ㄹ form, 수 and 거 are said tense (할 수 [할 쑤], 갈 거예요 [갈 꺼예요]); and 다섯 명 is said [다선 명].
def pron(s):
    out = _word_pron(s).split(' ')
    src = [w for w in s.split(' ') if w]
    for i in range(1, len(out)):
        prev = src[i - 1]
        last = (ord(prev[-1]) - 0xAC00) % 28 if '가' <= prev[-1] <= '힣' else -1
        if last == 8 and (src[i].startswith('수') or src[i].startswith('거')):   # 8 is ㄹ
            out[i] = {'수': '쑤', '거': '꺼'}[src[i][0]] + out[i][1:]
        if prev == '다섯' and src[i].startswith('명'):
            out[i - 1] = '다선'
        # nasal change across the space, as it's said in a phrase: a final ㄱ/ㄷ/ㅂ sound before ㄴ or ㅁ becomes
        # ㅇ/ㄴ/ㅁ (몇 명 [면 명], 한국 남자 [한궁 남자], 밥 먹어요 [밤 머거요])
        a, b = out[i - 1], out[i]
        if a and b and '가' <= a[-1] <= '힣' and '가' <= b[0] <= '힣':
            fin = (ord(a[-1]) - 0xAC00) % 28
            ini = (ord(b[0]) - 0xAC00) // 588
            if ini in (2, 6) and fin in (1, 7, 17):   # next starts ㄴ or ㅁ; this ends ㄱ, ㄷ or ㅂ
                out[i - 1] = a[:-1] + chr(ord(a[-1]) - fin + {1: 21, 7: 4, 17: 16}[fin])
    # the -(으)ㄹ게요 ending is said tense: 줄게요 [줄께요], 기다릴게요 [기다릴께요]
    for i, w in enumerate(out):
        for j in range(1, len(w)):
            c = w[j - 1]
            if w[j] == '게' and '가' <= c <= '힣' and (ord(c) - 0xAC00) % 28 == 8 and w[j:].startswith('게요'):
                out[i] = w[:j] + '께' + w[j + 1:]
                break
    return ' '.join(out)
