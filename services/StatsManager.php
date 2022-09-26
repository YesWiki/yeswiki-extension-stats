<?php

/*
 * This file is part of the YesWiki Extension stats.
 *
 * Authors : see README.md file that was distributed with this source code.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
namespace YesWiki\Stats\Service;

use DateTime;
use Exception;
use Symfony\Component\DependencyInjection\ParameterBag\ParameterBagInterface;
use YesWiki\Core\Service\TripleStore;
use YesWiki\Wiki;

class StatsManager
{
    public const TYPE_URI = "https://yeswiki.net/vocabulary/stats";

    public const KEY_FOR_VISITS = "v";
    public const KEY_FOR_VISITORS = "s";

    protected $cache;
    protected $params;
    protected $tripleStore;
    protected $statsActivated;
    protected $wiki;

    public function __construct(ParameterBagInterface $params, TripleStore $tripleStore, Wiki $wiki)
    {
        $this->cache = []; // to prevent multiple catch on same call
        $this->params = $params;
        $this->tripleStore = $tripleStore;
        $this->statsActivated = null;
        $this->wiki = $wiki;
    }

    /**
     * get stats for a tag
     * @param string $tag
     */
    public function getTagStats(string $tag): array
    {
        if (empty($tag)) {
            throw new Exception('tag should not be empty !');
        }
        $stats = $this->formatStats($this->getTriples($tag));
        return empty($stats) ? [] : array_values($stats)[0] ;
    }
    
    /**
     * get stats for all tag
     */
    public function getStats(): array
    {
        return $this->formatStats($this->getTriples(""));
    }
        
    /**
     * register stats for a tag
     * @param string $tag
     */
    public function registerStatsNotAdmin(string $tag)
    {
        if ($this->areStatsActivated() && !$this->wiki->UserIsAdmin() && !empty($tag) && !in_array($tag, $this->cache)) {
            $this->cache[] = $tag;
            $stats = $this->getTagStats($tag);
            $date = new DateTime();
            list($year, $month) = array_map('intval', explode('-', $date->format('Y-n')));
            if (!isset($stats[$year])) {
                $stats[$year] = [];
            }
            if (!isset($stats[$year][$month])) {
                $stats[$year][$month] = [self::KEY_FOR_VISITS=>0,self::KEY_FOR_VISITORS=>0];
            }
            $stats[$year][$month][self::KEY_FOR_VISITS] += 1;
            if (!isset($_SESSION['stats'])) {
                $_SESSION['stats'] = [];
            }
            // init $year or clean others (no keep data in sessions)
            $_SESSION['stats'] = [
                $year => $_SESSION['stats'][$year] ?? []
            ];
            // init $month or clean others (no keep data in sessions)
            $_SESSION['stats'][$year]  = [
                $month => $_SESSION['stats'][$year][$month] ?? []
            ];
            if (!in_array($tag, $_SESSION['stats'][$year][$month])) {
                $_SESSION['stats'][$year][$month][] = $tag;
                $stats[$year][$month][self::KEY_FOR_VISITORS] += 1;
            }
            $this->saveStats($tag, $stats);
        }
    }

    public function areStatsActivated(): bool
    {
        if (is_null($this->statsActivated)) {
            $this->statsActivated = in_array($this->params->get('stats_activated'), [1,"1",true,"true"], true);
        }
        return $this->statsActivated;
    }
    
    /**
     * get triples according to tag (or all if empty)
     * @param string $tag
     * @return array
     */
    protected function getTriples(string $tag = ""): array
    {
        if (empty($tag)) {
            $tag = null;
        }
        $triples = $this->tripleStore->getMatching(
            $tag,
            self::TYPE_URI,
            null,
            "=",
            "=",
            "LIKE"
        );
        return is_array($triples) && count($triples) > 0 ? $triples : [] ;
    }
    
    /**
     * format triples into array
     * @param array $triples
     * @return array [$tag => [$year=>[$month=>['visits'=> int,'visitors'=>int]]]];
     */
    protected function formatStats(array $triples): array
    {
        $data = [];
        foreach ($triples as $triple) {
            if (!empty($triple['resource']) && !empty($triple['value'])) {
                $tag = $triple['resource'];
                $values = json_decode($triple['value'], true);
                if (is_array($values)) {
                    if (!isset($data[$tag])) {
                        $data[$tag] = [];
                    }
                    foreach ($values as $year => $yearData) {
                        if (is_int($year) && $year > 2000 && $year < 3000 && is_array($yearData)) {
                            if (!isset($data[$tag] [$year])) {
                                $data[$tag][$year] = [];
                            }
                            foreach ($yearData as $month => $monthData) {
                                if (is_int($month) && $month > 0 && $month < 13 && is_array($monthData)) {
                                    if (!isset($data[$tag] [$year][$month])) {
                                        $data[$tag][$year][$month] = [];
                                    }
                                    foreach ([self::KEY_FOR_VISITS,self::KEY_FOR_VISITORS] as $key) {
                                        if (!isset($data[$tag] [$year][$month][$key])) {
                                            $data[$tag] [$year][$month][$key] = 0;
                                        }
                                        $data[$tag][$year][$month][$key] += (
                                            !empty($monthData[$key]) &&
                                            is_int($monthData[$key]) &&
                                            $monthData[$key] >= 0
                                        ) ? $monthData[$key] : 0;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        return $data;
    }

    /**
     * save stats
     * @param string $tag
     * @param array $values
     */
    protected function saveStats(string $tag, array $values)
    {
        $encodedValues = json_encode($values);
        // keep only one triple
        $previousTriples = $this->tripleStore->getAll(
            $tag,
            self::TYPE_URI,
            "",
            ""
        );
        if (!empty($previousTriples)) {
            $keys = array_keys($previousTriples);
            $firstKey = array_shift($keys); // remove first one to keep it
            foreach ($keys as $key) {
                $this->tripleStore->delete(
                    $previousTriples[$key]['resource'],
                    self::TYPE_URI,
                    $previousTriples[$key]['value']
                );
            }
    
            // update first one
    
            $this->tripleStore->update(
                $tag,
                self::TYPE_URI,
                $previousTriples[$firstKey]['value'],
                $encodedValues,
                "",
                ""
            );
        } else {
            $this->tripleStore->create(
                $tag,
                self::TYPE_URI,
                $encodedValues,
                "",
                ""
            );
        }
    }
}
