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
    return ' '.join(out)
